import { defineConfig } from 'vite'
import { execFileSync } from 'node:child_process'

export default defineConfig(() => {
  let commit = process.env.CF_PAGES_COMMIT_SHA
  if (!commit) {
    try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() }
    catch { commit = 'development' }
  }
  const release = { commit, builtAt: new Date().toISOString(), branch: process.env.CF_PAGES_BRANCH || 'local' }
  return {
    define: { 'import.meta.env.VITE_BUILD_SHA': JSON.stringify(commit.slice(0, 8)) },
    plugins: [{ name: 'steel-release', generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(release) }) } }],
  }
})
