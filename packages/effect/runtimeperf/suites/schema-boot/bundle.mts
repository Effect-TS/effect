import { build, version } from "esbuild"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const fixturesDir = fileURLToPath(new URL("./fixtures/", import.meta.url))
export const entries = ["baseline", "graph", "ui", "httpapi"]
export const esbuildVersion = version

const repoRoot = fileURLToPath(new URL("../../../../../", import.meta.url))

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

export const bundle = async (effectDir: string, outDir: string) => {
  const result: Record<string, { path: string; bytes: number; sha256: string }> = {}
  for (const name of entries) {
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
    result[name] = {
      path: outfile,
      bytes: contents.length,
      sha256: createHash("sha256").update(contents).digest("hex")
    }
  }
  return result
}
