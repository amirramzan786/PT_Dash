import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationUrl = new URL('../supabase/migrations/20260914150000_ai_coach_aggregate_read_model.sql', import.meta.url)
const apiUrl = new URL('../src/lib/steelApi.js', import.meta.url)

test('AI Coach aggregate is owner-scoped, read-only and sparse-data safe', async () => {
  const migration = await readFile(migrationUrl, 'utf8')
  const api = await readFile(apiUrl, 'utf8')

  assert.match(migration, /create or replace function public\.get_my_ai_coach_aggregate\(\)/)
  assert.match(migration, /security invoker/i)
  assert.match(migration, /auth\.uid\(\)/)
  assert.match(migration, /where c\.user_id = v_user_id/)
  assert.match(migration, /where s\.user_id = v_user_id/)
  assert.match(migration, /where m\.user_id = v_user_id/)
  assert.match(migration, /where w\.user_id = v_user_id/)
  assert.match(migration, /'schema_version', 'ai-coach-aggregate-v1'/)
  assert.match(migration, /'latest_checkin', coalesce\(v_latest_checkin, 'null'::jsonb\)/)
  assert.match(migration, /revoke all on function public\.get_my_ai_coach_aggregate\(\) from public, anon, authenticated/)
  assert.match(migration, /grant execute on function public\.get_my_ai_coach_aggregate\(\) to authenticated/)
  assert.doesNotMatch(migration, /insert into|update public\.|delete from public\./i)
  assert.match(api, /export async function getAiCoachAggregate\(\)/)
  assert.match(api, /rpc\('get_my_ai_coach_aggregate'\)/)
})
