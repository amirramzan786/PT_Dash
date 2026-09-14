package uk.co.projectsteel.mobile;

import android.content.Intent;

import androidx.activity.result.ActivityResult;
import androidx.health.connect.client.HealthConnectClient;
import androidx.health.connect.client.PermissionController;
import androidx.health.connect.client.records.ExerciseSessionRecord;
import androidx.health.connect.client.records.StepsRecord;
import androidx.health.connect.client.records.metadata.Metadata;
import androidx.health.connect.client.request.ReadRecordsRequest;
import androidx.health.connect.client.response.ReadRecordsResponse;
import androidx.health.connect.client.time.TimeRangeFilter;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

import kotlin.ResultKt;
import kotlin.coroutines.Continuation;
import kotlin.coroutines.CoroutineContext;
import kotlin.coroutines.EmptyCoroutineContext;
import kotlin.coroutines.intrinsics.IntrinsicsKt;
import kotlin.jvm.internal.Reflection;

/**
 * Foreground-only, read-only Health Connect access for the first Android pilot.
 * Raw Health Connect records never cross the Capacitor boundary; the plugin
 * emits daily provider-neutral metric summaries instead.
 */
@CapacitorPlugin(name = "SteelHealthConnect")
public final class SteelHealthConnectPlugin extends Plugin {
    private static final String PROVIDER_PACKAGE = "com.google.android.apps.healthdata";
    private static final String SCOPE_STEPS = "steps";
    private static final String SCOPE_WORKOUT_MINUTES = "workout_minutes";
    private static final DateTimeFormatter ISO_INSTANT = DateTimeFormatter.ISO_INSTANT;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private HealthConnectClient client;

    @Override
    public void handleOnDestroy() {
        executor.shutdownNow();
        super.handleOnDestroy();
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        int status = HealthConnectClient.getSdkStatus(getContext(), PROVIDER_PACKAGE);
        JSObject result = new JSObject();
        result.put("available", status == HealthConnectClient.SDK_AVAILABLE);
        result.put("status", statusName(status));
        if (status == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
            result.put("reason", "Health Connect needs to be installed or updated on this device.");
        } else if (status == HealthConnectClient.SDK_UNAVAILABLE) {
            result.put("reason", "Health Connect is unavailable on this device.");
        }
        call.resolve(result);
    }

    @PluginMethod
    public void requestAuthorization(PluginCall call) {
        if (!isSdkAvailable(call)) return;
        Set<String> permissions = requiredPermissions();
        Intent intent = PermissionController.createRequestPermissionResultContract().createIntent(getContext(), permissions);
        startActivityForResult(call, intent, "permissionResult");
    }

    @ActivityCallback
    private void permissionResult(PluginCall call, ActivityResult result) {
        Set<String> granted;
        try {
            granted = PermissionController.createRequestPermissionResultContract().parseResult(result.getResultCode(), result.getData());
        } catch (Exception error) {
            call.reject("Health Connect permissions could not be read.", "PERMISSION_RESULT_FAILED");
            return;
        }
        if (granted == null) granted = Collections.emptySet();
        JSObject response = new JSObject();
        response.put("granted", granted.containsAll(requiredPermissions()));
        response.put("readableScopes", scopeNames(granted));
        response.put("deniedScopes", deniedScopeNames(granted));
        response.put("consentVersion", "native-activity-v1");
        response.put("consentedAt", ISO_INSTANT.format(Instant.now()));
        call.resolve(response);
    }

    @PluginMethod
    public void readActivity(PluginCall call) {
        if (!isSdkAvailable(call)) return;
        Instant start;
        Instant end;
        ZoneId zone;
        try {
            start = Instant.parse(call.getString("start"));
            end = Instant.parse(call.getString("end"));
            zone = ZoneId.of(call.getString("timeZone", ZoneId.systemDefault().getId()));
            if (!start.isBefore(end)) throw new IllegalArgumentException();
        } catch (Exception error) {
            call.reject("Provide a valid start, end and IANA time zone.", "INVALID_RANGE");
            return;
        }

        HealthConnectClient healthClient = getHealthConnectClient();
        runSuspend(
            (Continuation<? super Set<String>> continuation) -> healthClient.getPermissionController().getGrantedPermissions(continuation),
            (Set<String> granted) -> {
                Set<String> grantedSet = granted == null ? Collections.emptySet() : granted;
                if (!grantedSet.containsAll(requiredPermissions())) {
                    JSObject denied = new JSObject();
                    denied.put("granted", false);
                    denied.put("deniedScopes", deniedScopeNames(grantedSet));
                    call.resolve(denied);
                    return;
                }
                readRecords(healthClient, start, end, zone, call);
            },
            error -> call.reject("Health Connect data could not be read.", "READ_FAILED")
        );
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent intent = new Intent(HealthConnectClient.getHealthConnectSettingsAction());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Health Connect settings could not be opened.", "OPEN_SETTINGS_FAILED");
        }
    }

    private void readRecords(HealthConnectClient healthClient, Instant start, Instant end, ZoneId zone, PluginCall call) {
        TimeRangeFilter range = TimeRangeFilter.between(start, end);
        ReadRecordsRequest<StepsRecord> stepsRequest = new ReadRecordsRequest<>(
            Reflection.getOrCreateKotlinClass(StepsRecord.class), range, Collections.emptySet(), true, 1000, null
        );
        ReadRecordsRequest<ExerciseSessionRecord> workoutRequest = new ReadRecordsRequest<>(
            Reflection.getOrCreateKotlinClass(ExerciseSessionRecord.class), range, Collections.emptySet(), true, 1000, null
        );
        runSuspend(
            (Continuation<? super ReadRecordsResponse<StepsRecord>> continuation) -> healthClient.readRecords(stepsRequest, continuation),
            (ReadRecordsResponse<StepsRecord> stepsResponse) -> runSuspend(
            (Continuation<? super ReadRecordsResponse<ExerciseSessionRecord>> continuation) -> healthClient.readRecords(workoutRequest, continuation),
                (ReadRecordsResponse<ExerciseSessionRecord> workoutResponse) -> {
                    if (stepsResponse.getPageToken() != null || workoutResponse.getPageToken() != null) {
                        call.reject("Health Connect returned more data than the bounded foreground read allows.", "READ_LIMIT");
                        return;
                    }
                    resolveRecords(call, stepsResponse.getRecords(), workoutResponse.getRecords(), zone);
                },
                error -> call.reject("Health Connect data could not be read.", "READ_FAILED")
            ),
            error -> call.reject("Health Connect data could not be read.", "READ_FAILED")
        );
    }

    private void resolveRecords(PluginCall call, List<StepsRecord> stepRecords, List<ExerciseSessionRecord> workoutRecords, ZoneId zone) {
        Map<String, MetricDay> days = new LinkedHashMap<>();
        Set<String> seenSteps = new HashSet<>();
        for (StepsRecord record : stepRecords) {
            Metadata metadata = record.getMetadata();
            String id = metadata == null ? null : metadata.getId();
            if (id != null && !seenSteps.add(id)) continue;
            String day = record.getStartTime().atZone(zone).toLocalDate().toString();
            MetricDay summary = days.computeIfAbsent(day, ignored -> new MetricDay(day, zone));
            summary.steps += Math.max(0, record.getCount());
            summary.include(record.getStartTime(), record.getEndTime());
        }

        Set<String> seenWorkouts = new HashSet<>();
        for (ExerciseSessionRecord record : workoutRecords) {
            Metadata metadata = record.getMetadata();
            String id = metadata == null ? null : metadata.getId();
            if (id != null && !seenWorkouts.add(id)) continue;
            String day = record.getStartTime().atZone(zone).toLocalDate().toString();
            MetricDay summary = days.computeIfAbsent(day, ignored -> new MetricDay(day, zone));
            summary.workoutMinutes += Math.max(0, Math.round(Duration.between(record.getStartTime(), record.getEndTime()).toMillis() / 60000d));
            summary.include(record.getStartTime(), record.getEndTime());
        }

        JSArray records = new JSArray();
        for (MetricDay day : days.values()) {
            if (day.steps > 0) records.put(day.toRecord(SCOPE_STEPS, day.steps));
            if (day.workoutMinutes > 0) records.put(day.toRecord(SCOPE_WORKOUT_MINUTES, day.workoutMinutes));
        }
        JSObject response = new JSObject();
        response.put("records", records);
        response.put("observed_at", ISO_INSTANT.format(Instant.now()));
        response.put("time_zone", zone.getId());
        call.resolve(response);
    }

    private HealthConnectClient getHealthConnectClient() {
        if (client == null) client = HealthConnectClient.getOrCreate(getContext(), PROVIDER_PACKAGE);
        return client;
    }

    private boolean isSdkAvailable(PluginCall call) {
        int status = HealthConnectClient.getSdkStatus(getContext(), PROVIDER_PACKAGE);
        if (status == HealthConnectClient.SDK_AVAILABLE) return true;
        call.resolve(new JSObject().put("available", false).put("status", statusName(status)).put("reason", "Health Connect is unavailable on this device."));
        return false;
    }

    private Set<String> requiredPermissions() {
        Set<String> permissions = new HashSet<>();
        permissions.add("android.permission.health.READ_STEPS");
        permissions.add("android.permission.health.READ_EXERCISE");
        return permissions;
    }

    private List<String> scopeNames(Set<String> permissions) {
        List<String> scopes = new ArrayList<>();
        if (permissions.contains("android.permission.health.READ_STEPS")) scopes.add(SCOPE_STEPS);
        if (permissions.contains("android.permission.health.READ_EXERCISE")) scopes.add(SCOPE_WORKOUT_MINUTES);
        return scopes;
    }

    private List<String> deniedScopeNames(Set<String> permissions) {
        List<String> denied = new ArrayList<>();
        if (!permissions.contains("android.permission.health.READ_STEPS")) denied.add(SCOPE_STEPS);
        if (!permissions.contains("android.permission.health.READ_EXERCISE")) denied.add(SCOPE_WORKOUT_MINUTES);
        return denied;
    }

    private String statusName(int status) {
        if (status == HealthConnectClient.SDK_AVAILABLE) return "available";
        if (status == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return "provider_update_required";
        return "unavailable";
    }

    private <T> void runSuspend(SuspendOperation<T> operation, Consumer<T> success, Consumer<Throwable> failure) {
        executor.execute(() -> {
            AtomicBoolean completed = new AtomicBoolean(false);
            Continuation<T> continuation = new Continuation<T>() {
                @Override public CoroutineContext getContext() { return EmptyCoroutineContext.INSTANCE; }
                @Override public void resumeWith(Object result) { finish(result); }
                private void finish(Object result) {
                    if (!completed.compareAndSet(false, true)) return;
                    try {
                        ResultKt.throwOnFailure(result);
                        success.accept((T) result);
                    } catch (Throwable error) {
                        failure.accept(error);
                    }
                }
            };
            try {
                Object result = operation.invoke(continuation);
                if (result != IntrinsicsKt.getCOROUTINE_SUSPENDED()) continuation.resumeWith(result);
            } catch (Throwable error) {
                failure.accept(error);
            }
        });
    }

    private interface SuspendOperation<T> { Object invoke(Continuation<? super T> continuation); }

    private static final class MetricDay {
        final String day;
        final ZoneId zone;
        long steps;
        long workoutMinutes;
        Instant start;
        Instant end;

        MetricDay(String day, ZoneId zone) { this.day = day; this.zone = zone; }

        void include(Instant recordStart, Instant recordEnd) {
            if (start == null || recordStart.isBefore(start)) start = recordStart;
            if (end == null || recordEnd.isAfter(end)) end = recordEnd;
        }

        JSObject toRecord(String metric, long value) {
            JSObject record = new JSObject();
            record.put("source", "health_connect");
            record.put("metric", metric);
            record.put("value", value);
            record.put("start_at", ISO_INSTANT.format(start));
            record.put("end_at", ISO_INSTANT.format(end));
            record.put("time_zone", zone.getId());
            record.put("source_record_id", "health_connect:" + day + ":" + metric + ":v1");
            record.put("observed_at", ISO_INSTANT.format(Instant.now()));
            record.put("confidence", 0.9);
            return record;
        }
    }
}
