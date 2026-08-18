/**
 * Build configuration for both plugin faces.
 *
 * The Host face is an ordinary ESM library. The Web face must be a Harness
 * client bundle, not a plain ESM module: the Web loader fetches
 * `exports["./client"]` as a classic script and requires it to register a lazy
 * CommonJS factory with `window.__ModuleLoader__.load({ id, factory })`.
 *
 * DeepSeek Harness builds its own client packages with an internal
 * `clientBundle()` tsdown preset that is not published for external use, so
 * this file is an audited equivalent of that emit contract, verified against
 * `packages/client/tsdown.client.ts` at Harness 0.1.0-rc.7
 * (commit 99f6f02fecdb7dff40c3fbc9470f5907c29f74ca):
 *
 * - CommonJS output wrapped in the loader's factory banner/footer.
 * - Browser platform, single `client.js` output file.
 * - Externals limited to the frozen loader module table (`PLATFORM_MODULES`),
 *   because a `require()` the table cannot answer throws at materialization.
 * - Everything else inlined, since cross-plugin value imports are forbidden.
 * - CSS Modules compiled in-bundle by lightningcss, injecting one
 *   `<style data-plugin>` tag per stylesheet so the loader can remove
 *   plugin-owned tags on unload.
 *
 * Rolldown pretty-prints the configured banner across several lines, which does
 * not match the single-line prefix the loader scans for, so `build:client` runs
 * `scripts/normalize-client-banner.mjs` afterwards.
 */
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve as resolvePath, sep } from 'node:path'
import { transform } from 'lightningcss'
import type { UserConfig } from 'tsdown'

/**
 * The module specifiers the Web shell shares into the frozen module table.
 * Mirrors `PLATFORM_MODULES` in `@deepseek-ai/dsh-client-web/src/platform`.
 */
const PLATFORM_MODULES: readonly string[] = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
]

/**
 * Runtime exemption carried by the shipped Harness compositions: the client
 * runtime row is registered before any dependent bundle materializes, so the
 * table answers this specifier natively.
 */
const RUNTIME_EXEMPTION = '@deepseek-ai/dsh-client-runtime/client'

const CLIENT_EXTERNALS: readonly string[] = [...PLATFORM_MODULES, RUNTIME_EXEMPTION]

const PLUGIN_ID = 'dsh-dify-marketplace'

/** Virtual-id wrapper keeping module CSS out of tsdown's own css pipeline. */
const CSS_VIRTUAL_PREFIX = '\0dsh-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'

/** The Host face: plain ESM consumed by the Cordis Loader through `main`. */
const hostConfig: UserConfig = {
  name: PLUGIN_ID,
  entry: ['lib/types/index.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  sourcemap: true,
}

/** The Web face: a `__ModuleLoader__` factory bundle at `lib/client.js`. */
const clientConfig: UserConfig = {
  name: `${PLUGIN_ID}/client`,
  entry: { client: 'lib/client-types/client/index.js' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2024',
  // Types ship from lib/client-types (tsc); dts here would wrap the
  // banner/footer into the declaration and break parsing.
  dts: false,
  sourcemap: true,
  clean: false,
  external: [...CLIENT_EXTERNALS],
  // Browser bundles inline node-idiom deps that read process.env.NODE_ENV; a
  // CJS output cannot carry import.meta.env, so both are substituted here.
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
  },
  // tsdown auto-externalizes package dependencies; anything the loader module
  // table cannot answer must be inlined instead or the factory throws.
  noExternal: (id: string) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
  plugins: [{
    name: 'dsh-css-modules-inline',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith('.module.css')) return null
      const fromImporter = importer === undefined ? source : resolvePath(dirname(importer), source)
      // tsc emit lives under lib/client-types; stylesheets stay in src/.
      const absolute = fromImporter.replace(`${sep}lib${sep}client-types${sep}`, `${sep}src${sep}`)
      return CSS_VIRTUAL_PREFIX + absolute + CSS_VIRTUAL_SUFFIX
    },
    async load(this: { addWatchFile(file: string): void }, virtualId: string) {
      if (!virtualId.startsWith(CSS_VIRTUAL_PREFIX)) return null
      const fileId = virtualId.slice(CSS_VIRTUAL_PREFIX.length, -CSS_VIRTUAL_SUFFIX.length)
      // The virtual id otherwise hides the physical stylesheet from the watch graph.
      this.addWatchFile(fileId)
      const source = await readFile(fileId)
      const { code, exports: cssExports } = transform({
        filename: fileId,
        code: source,
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
      })
      const classMap: Record<string, string> = {}
      for (const [local, exported] of Object.entries(cssExports ?? {})) classMap[local] = exported.name
      const tagId = `${PLUGIN_ID}/${basename(fileId)}`
      return [
        `const css = ${JSON.stringify(code.toString())};`,
        `const tagId = ${JSON.stringify(tagId)};`,
        'if (typeof document !== \'undefined\' && document.querySelector(\'style[data-plugin-css=\' + JSON.stringify(tagId) + \']\') === null) {',
        '  const tag = document.createElement(\'style\');',
        `  tag.dataset.plugin = ${JSON.stringify(PLUGIN_ID)};`,
        '  tag.dataset.pluginCss = tagId;',
        '  tag.textContent = css;',
        '  document.head.appendChild(tag);',
        '}',
        `export default ${JSON.stringify(classMap)};`,
      ].join('\n')
    },
  }],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default ({ env }: { env?: Record<string, string> }): UserConfig[] => {
  const face = env?.DSH_BUILD_FACE
  if (face === 'host') return [hostConfig]
  if (face === 'client') return [clientConfig]
  return [hostConfig, clientConfig]
}
