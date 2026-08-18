#!/usr/bin/env node
/**
 * Collapse the pretty-printed client-bundle banner and footer onto the
 * single lines the Harness client module loader emits.
 *
 * Rolldown reformats the configured `banner`/`footer` across several lines.
 * The loader only requires that the bundle call `window.__ModuleLoader__.load({
 * id, factory })` at script execution, but keeping the emitted prefix and
 * suffix byte-identical to Harness-built bundles makes the artifact diffable
 * against them.
 */
import fs from 'node:fs'

const file = 'lib/client.js'
const name = JSON.parse(fs.readFileSync('package.json', 'utf8')).name
const required = `window.__ModuleLoader__.load({ id: ${JSON.stringify(name)}, factory: (require) => {`
const requiredFooter = 'return module.exports; } });'

if (!fs.existsSync(file)) {
  console.error(`normalize-client-banner: ${file} is missing; run the client build first`)
  process.exit(1)
}

let code = fs.readFileSync(file, 'utf8')
const mapMatch = code.match(/\n\/\/# sourceMappingURL=.*\n?$/)
const sourceMap = mapMatch?.[0] ?? ''
if (mapMatch !== null) code = code.slice(0, mapMatch.index)

if (!code.startsWith(required)) {
  const lines = code.split('\n')
  const expected = [
    'window.__ModuleLoader__.load({',
    `\tid: ${JSON.stringify(name)},`,
    '\tfactory: (require) => {',
  ]
  if (lines[0] !== expected[0] || lines[1] !== expected[1] || lines[2] !== expected[2]) {
    console.error(`normalize-client-banner: unexpected ${file} header:\n${lines.slice(0, 3).join('\n')}`)
    process.exit(1)
  }
  lines[0] = required
  lines[1] = ''
  lines[2] = ''
  code = lines.join('\n')
}

if (!code.trimEnd().endsWith(requiredFooter)) {
  const prettyFooter = /\n\s*return module\.exports;\n\s*\}\n\}\);\s*$/
  if (!prettyFooter.test(code)) {
    console.error(`normalize-client-banner: unexpected ${file} footer:\n${code.slice(-160)}`)
    process.exit(1)
  }
  code = code.replace(prettyFooter, `\n${requiredFooter}`)
}

if (!code.trimEnd().endsWith(requiredFooter)) {
  console.error(`normalize-client-banner: ${file} does not end with the loader factory footer`)
  process.exit(1)
}

fs.writeFileSync(file, `${code.trimEnd()}${sourceMap}`)
console.log(`normalize-client-banner ok: ${file}`)
