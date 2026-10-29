import * as babel from "@babel/core"
import * as esbuild from "esbuild"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const packageDir = fileURLToPath(new URL("../..", import.meta.url))
const packagesDir = fileURLToPath(new URL("../../../../", import.meta.url))

// The published build runs babel with annotate-pure-calls over the compiler
// output. Bundlers rely on those annotations to drop unused module-scope
// calls, so the same step is reproduced here for every workspace source
// module. Without it esbuild shakes source differently from the published
// packages.
const annotatePureCalls: esbuild.Plugin = {
  name: "annotate-pure-calls",
  setup(build) {
    build.onLoad({ filter: /\.ts$/ }, async (args) => {
      if (!args.path.startsWith(packagesDir) || args.path.includes("node_modules")) {
        return undefined
      }
      const source = await fs.readFile(args.path, "utf8")
      const transpiled = await esbuild.transform(source, {
        loader: "ts",
        format: "esm",
        target: "es2022",
        sourcefile: args.path,
        tsconfigRaw: { compilerOptions: { verbatimModuleSyntax: true } }
      })
      const annotated = await babel.transformAsync(transpiled.code, {
        babelrc: false,
        configFile: false,
        compact: false,
        cwd: packageDir,
        filename: args.path,
        plugins: ["annotate-pure-calls"]
      })
      return { contents: annotated!.code!, loader: "js" }
    })
  }
}

/**
 * Bundles a fixture, given relative to the package directory, with esbuild
 * and returns the absolute paths of the modules that made it into the output,
 * including modules reached through dynamic imports. Only the output entry of
 * the metafile lists retained modules; `metafile.inputs` is the whole import
 * graph, tree-shaken or not.
 */
export const bundledModules = async (
  fixture: string,
  options: Pick<esbuild.BuildOptions, "platform" | "conditions">
): Promise<ReadonlyArray<string>> => {
  const result = await esbuild.build({
    ...options,
    entryPoints: [path.join(packageDir, fixture)],
    bundle: true,
    write: false,
    metafile: true,
    format: "esm",
    target: "es2022",
    logLevel: "silent",
    absWorkingDir: packageDir,
    plugins: [annotatePureCalls]
  })
  const [output] = Object.values(result.metafile.outputs)
  return Object.keys(output.inputs).map((input) => path.resolve(packageDir, input))
}
