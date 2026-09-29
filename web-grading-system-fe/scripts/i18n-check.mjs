#!/usr/bin/env node
// Guards the i18n rule: every key must exist in BOTH vi.json and en.json.
// Exits non-zero with the diff so `npm run i18n:check` fails the build on drift.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function flatten(value, prefix = '', out = new Set()) {
  if (value === null || typeof value !== 'object') {
    out.add(prefix)
    return out
  }
  for (const [key, child] of Object.entries(value)) {
    flatten(child, prefix ? `${prefix}.${key}` : key, out)
  }
  return out
}

function load(file) {
  return flatten(JSON.parse(readFileSync(resolve(root, `src/locales/${file}`), 'utf8')))
}

const vi = load('vi.json')
const en = load('en.json')

const missingInEn = [...vi].filter((key) => !en.has(key))
const missingInVi = [...en].filter((key) => !vi.has(key))

if (missingInEn.length || missingInVi.length) {
  if (missingInEn.length) console.error(`Missing in en.json:\n  - ${missingInEn.join('\n  - ')}`)
  if (missingInVi.length) console.error(`Missing in vi.json:\n  - ${missingInVi.join('\n  - ')}`)
  process.exit(1)
}

console.log(`i18n:check OK — ${vi.size} keys in sync (vi.json / en.json)`)
