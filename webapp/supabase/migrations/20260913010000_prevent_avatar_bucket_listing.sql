-- Profile photos intentionally use public URLs, but no client needs to
-- enumerate every avatar through the Storage API. Keep object retrieval while
-- refusing the `object.list` operation that the broad historical policy
-- allowed.
drop policy if exists avatar_public_read on storage.objects;

create policy "avatar_public_read_without_listing"
on storage.objects
for select
to public
using (
  bucket_id = 'avatars'
  and storage.allow_any_operation(array[
    'object.get_authenticated_info',
    'object.get_authenticated'
  ])
);
