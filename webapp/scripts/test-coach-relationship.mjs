import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationUrl = new URL('../supabase/migrations/20260914130000_coach_relationship_lifecycle.sql', import.meta.url)
const designUrl = new URL('../../docs/codex/steel-coach-relationship-lifecycle-2026-09-14.md', import.meta.url)

test('Coach relationship migration is consent-gated and fail-closed', async () => {
  const migration = await readFile(migrationUrl, 'utf8')

  assert.match(migration, /create table if not exists public\.coach_client_relationships/)
  for (const state of ['invited', 'accepted_pending_consent', 'active', 'paused', 'transfer_pending', 'revoked', 'expired']) {
    assert.match(migration, new RegExp(`['"]${state}['"]`))
  }
  assert.match(migration, /coach_relationship_one_active_client_idx/)
  assert.match(migration, /revoke all on table public\.coach_client_relationships from anon, authenticated/)
  assert.match(migration, /r\.state = 'active'[\s\S]*r\.consented_at is not null[\s\S]*'coach_progress' = any\(r\.consent_domains\)/)
  assert.match(migration, /revoke all on function public\.create_coach_invitation\([^)]*\) from public, anon, authenticated/)
  assert.match(migration, /grant execute on function public\.create_coach_invitation\([^)]*\) to service_role/)
  assert.match(migration, /grant execute on function public\.accept_coach_invitation\(uuid\) to authenticated/)
  assert.match(migration, /grant execute on function public\.grant_coach_visibility\(uuid, text, text\[\]\) to authenticated/)
  assert.match(migration, /invitation_token_hash = null/)
  assert.match(migration, /set state = 'revoked'/)
  assert.match(migration, /set state = 'transfer_pending'/)
  assert.match(migration, /set search_path = public, pg_catalog/)
})

test('Coach relationship design record covers ownership, switching and RLS cases', async () => {
  const design = await readFile(designUrl, 'utf8')

  for (const phrase of ['accepted_pending_consent', 'transfer_pending', 'fail-closed', 'one active Coach', 'client’s historical rows remain present', 'RLS']) {
    assert.match(design, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
  }
  assert.match(design, /Authorization and lifecycle test cases/)
  assert.match(design, /unlinking never deletes the client’s Steel\s+history/)
})
