import { build } from "esbuild"
import { existsSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { repoRoot, sha256 } from "../../utils.mts"

const fixturesDir = fileURLToPath(new URL("./fixtures/", import.meta.url))
const entries = ["baseline", "graph", "ui", "httpapi"]

// Resolves `effect` and `effect/*` to the TypeScript sources of the measured
// revision, so both sides of a comparison bundle identical fixtures.
const effectSource = (effectDir: string) => ({
  name: "effect-source",
  setup(builder: any) {
    builder.onResolve({ filter: /^effect(\/|$)/ }, ({ path }: { path: string }) => {
      const subpath = path === "effect" ? "index" : path.slice("effect/".length)
      for (const candidate of [`${subpath}.ts`, join(subpath, "index.ts")]) {
        const file = join(effectDir, "src", candidate)
        if (existsSync(file) && statSync(file).isFile()) return { path: file }
      }
      throw new Error(`Cannot resolve ${path} in ${effectDir}`)
    })
  }
})

export const bundle = async (effectDir: string, outDir: string) =>
  Object.fromEntries(await Promise.all(entries.map(async (name) => {
    const outfile = join(outDir, `${name}.mjs`)
    await build({
      entryPoints: [join(fixturesDir, `${name}.ts`)],
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      target: "es2022",
      sourcemap: "linked",
      sourcesContent: false,
      logLevel: "error",
      plugins: [effectSource(resolve(effectDir))],
      // Third-party dependencies resolve from this checkout, so base worktrees need no install.
      nodePaths: [join(repoRoot, "packages/effect/node_modules"), join(repoRoot, "node_modules")]
    })
    const contents = readFileSync(outfile)
    return [name, { path: outfile, bytes: contents.length, sha256: sha256(contents) }] as const
  })))
