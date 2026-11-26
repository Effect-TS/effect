import { build } from "esbuild"
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs"
import { join, relative, resolve, sep } from "node:path"
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

// esbuild precedes each module with a comment naming its path from the working
// directory. Naming the measured sources by the same path on both sides keeps
// bundles of identical source byte-identical, wherever the revision is checked out.
const pathComments = (effectDir: string) => {
  const prefix = relative(repoRoot, effectDir).split(sep).join("/")
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return (code: string) => code.replace(new RegExp(`^(\\s*)// ${escaped}/`, "gm"), "$1// packages/effect/")
}

export const bundle = async (effectDir: string, outDir: string) => {
  const normalize = pathComments(resolve(effectDir))
  mkdirSync(outDir, { recursive: true })
  return Object.fromEntries(await Promise.all(entries.map(async (name) => {
    const outfile = join(outDir, `${name}.mjs`)
    const { outputFiles } = await build({
      entryPoints: [join(fixturesDir, `${name}.ts`)],
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      target: "es2022",
      sourcemap: "linked",
      sourcesContent: false,
      logLevel: "error",
      absWorkingDir: repoRoot,
      write: false,
      plugins: [effectSource(resolve(effectDir))],
      // Third-party dependencies resolve from this checkout, so base worktrees need no install.
      nodePaths: [join(repoRoot, "packages/effect/node_modules"), join(repoRoot, "node_modules")]
    })
    let contents = ""
    for (const file of outputFiles) {
      if (file.path === outfile) contents = normalize(file.text)
      else writeFileSync(file.path, file.contents)
    }
    writeFileSync(outfile, contents)
    return [name, { path: outfile, bytes: Buffer.byteLength(contents), sha256: sha256(contents) }] as const
  })))
}
