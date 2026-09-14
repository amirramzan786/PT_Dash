import Foundation
import HealthKit
import UIKit
import Capacitor

/// Read-only, foreground HealthKit access for the first Steel activity pilot.
/// Raw HealthKit objects never cross the Capacitor boundary.
@objc(SteelHealthKitPlugin)
public final class SteelHealthKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SteelHealthKitPlugin"
    public let jsName = "SteelHealthKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise),
    ]

    private let healthStore = HKHealthStore()

    @objc func isAvailable(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["available": false, "reason": "Health data is unavailable on this device."])
            return
        }
        call.resolve(["available": true])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["granted": false, "deniedScopes": requestedScopes(from: call), "reason": "Health data is unavailable on this device."])
            return
        }

        let requested = requestedScopes(from: call)
        let writeScopes = call.getArray("write", String.self) ?? []
        guard writeScopes.isEmpty else {
            call.reject("Steel HealthKit is read-only; write scopes are not supported.", "INVALID_SCOPES")
            return
        }
        guard let readTypes = readTypes(from: requested, call: call) else { return }

        healthStore.requestAuthorization(toShare: [], read: readTypes) { [weak self] success, error in
            guard let self else { return }
            if let error {
                call.resolve(["granted": false, "deniedScopes": requested, "reason": self.safeErrorMessage(error)])
                return
            }

            // HealthKit intentionally does not expose read authorization state.
            // A bounded read confirms the requested types are queryable; an
            // empty result is still a successful read and creates no fake row.
            let end = Date()
            self.performRead(start: end.addingTimeInterval(-86400), end: end, timeZone: .current) { records, readError in
                if let readError {
                    call.resolve(["granted": false, "deniedScopes": requested, "reason": self.safeErrorMessage(readError)])
                    return
                }
                call.resolve([
                    "granted": success,
                    "deniedScopes": [],
                    "readableScopes": requested,
                    "successfulReadAt": self.isoString(Date()),
                    "recordCount": records.count,
                ])
            }
        }
    }

    @objc func readActivity(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Health data is unavailable on this device.", "UNAVAILABLE")
            return
        }
        guard let start = parseDate(call.getString("start")),
              let end = parseDate(call.getString("end")),
              start < end else {
            call.reject("Provide a valid start and end ISO timestamp.", "INVALID_RANGE")
            return
        }
        let timeZoneIdentifier = call.getString("timeZone") ?? TimeZone.current.identifier
        guard let timeZone = TimeZone(identifier: timeZoneIdentifier) else {
            call.reject("Provide a valid IANA time zone.", "INVALID_TIME_ZONE")
            return
        }

        performRead(start: start, end: end, timeZone: timeZone) { [weak self] records, error in
            guard let self else { return }
            if let error {
                call.reject(self.safeErrorMessage(error), "READ_FAILED")
                return
            }
            call.resolve(["records": records, "observed_at": self.isoString(Date()), "time_zone": timeZone.identifier])
        }
    }

    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else {
                call.reject("Settings are unavailable.", "UNAVAILABLE")
                return
            }
            UIApplication.shared.open(url) { opened in
                opened ? call.resolve() : call.reject("Settings could not be opened.", "OPEN_SETTINGS_FAILED")
            }
        }
    }

    private func readTypes(from scopes: [String], call: CAPPluginCall) -> Set<HKObjectType>? {
        var types = Set<HKObjectType>()
        for scope in scopes {
            switch scope {
            case "steps":
                guard let type = HKObjectType.quantityType(forIdentifier: .stepCount) else {
                    call.reject("Step count is unavailable.", "UNAVAILABLE")
                    return nil
                }
                types.insert(type)
            case "workout_minutes":
                types.insert(HKObjectType.workoutType())
            default:
                call.reject("Unsupported HealthKit read scope: \(scope).", "INVALID_SCOPES")
                return nil
            }
        }
        return types
    }

    private func requestedScopes(from call: CAPPluginCall) -> [String] {
        let scopes = call.getArray("read", String.self) ?? ["steps", "workout_minutes"]
        var seen = Set<String>()
        return scopes
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
            .filter { !$0.isEmpty && seen.insert($0).inserted }
    }

    private func performRead(start: Date, end: Date, timeZone: TimeZone, completion: @escaping ([[String: Any]], Error?) -> Void) {
        guard let stepType = HKObjectType.quantityType(forIdentifier: .stepCount) else {
            completion([], NSError(domain: "SteelHealthKit", code: 1, userInfo: [NSLocalizedDescriptionKey: "Step count is unavailable."]))
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        var stepSamples: [HKQuantitySample] = []
        var workouts: [HKWorkout] = []
        var firstError: Error?
        let group = DispatchGroup()
        let lock = NSLock()

        group.enter()
        healthStore.execute(HKSampleQuery(sampleType: stepType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            lock.lock(); defer { lock.unlock() }
            if let error { firstError = firstError ?? error }
            stepSamples = samples as? [HKQuantitySample] ?? []
            group.leave()
        })

        group.enter()
        healthStore.execute(HKSampleQuery(sampleType: HKObjectType.workoutType(), predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            lock.lock(); defer { lock.unlock() }
            if let error { firstError = firstError ?? error }
            workouts = samples as? [HKWorkout] ?? []
            group.leave()
        })

        group.notify(queue: .global(qos: .userInitiated)) { [weak self] in
            guard let self else { return }
            if let firstError {
                completion([], firstError)
                return
            }
            var calendar = Calendar(identifier: .gregorian)
            calendar.timeZone = timeZone
            completion(self.aggregateSteps(stepSamples, calendar: calendar, timeZone: timeZone) + self.aggregateWorkouts(workouts, calendar: calendar, timeZone: timeZone), nil)
        }
    }

    private func aggregateSteps(_ samples: [HKQuantitySample], calendar: Calendar, timeZone: TimeZone) -> [[String: Any]] {
        var totals: [String: Double] = [:]
        var bounds: [String: (Date, Date)] = [:]
        for sample in samples {
            let day = calendar.startOfDay(for: sample.startDate)
            let key = dayKey(day, calendar: calendar)
            totals[key, default: 0] += sample.quantity.doubleValue(for: .count())
            let current = bounds[key] ?? (sample.startDate, sample.endDate)
            bounds[key] = (min(current.0, sample.startDate), max(current.1, sample.endDate))
        }
        return totals.keys.sorted().compactMap { key in
            guard let (start, end) = bounds[key] else { return nil }
            return record(metric: "steps", value: max(0, Int(totals[key, default: 0].rounded())), start: start, end: end, day: key, timeZone: timeZone)
        }
    }

    private func aggregateWorkouts(_ samples: [HKWorkout], calendar: Calendar, timeZone: TimeZone) -> [[String: Any]] {
        var totals: [String: Double] = [:]
        var bounds: [String: (Date, Date)] = [:]
        for workout in samples {
            let day = calendar.startOfDay(for: workout.startDate)
            let key = dayKey(day, calendar: calendar)
            totals[key, default: 0] += workout.duration / 60
            let current = bounds[key] ?? (workout.startDate, workout.endDate)
            bounds[key] = (min(current.0, workout.startDate), max(current.1, workout.endDate))
        }
        return totals.keys.sorted().compactMap { key in
            guard let (start, end) = bounds[key] else { return nil }
            return record(metric: "workout_minutes", value: max(0, Int(totals[key, default: 0].rounded())), start: start, end: end, day: key, timeZone: timeZone)
        }
    }

    private func record(metric: String, value: Int, start: Date, end: Date, day: String, timeZone: TimeZone) -> [String: Any] {
        ["source": "apple_health", "metric": metric, "value": value, "start_at": isoString(start), "end_at": isoString(end), "time_zone": timeZone.identifier, "source_record_id": "apple_health:\(day):\(metric):v1", "observed_at": isoString(Date()), "confidence": 0.9]
    }

    private func dayKey(_ date: Date, calendar: Calendar) -> String {
        let components = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", components.year ?? 0, components.month ?? 0, components.day ?? 0)
    }

    private func parseDate(_ value: String?) -> Date? {
        guard let value else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: value) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: value)
    }

    private func isoString(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        return formatter.string(from: date)
    }

    private func safeErrorMessage(_: Error) -> String {
        "Health data could not be read."
    }
}
