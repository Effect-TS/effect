/**
 * TypeScript source documentation frontend.
 *
 * @since 0.6.0
 */
import * as Effect from "effect/Effect"
import * as Glob from "glob"
import * as path from "node:path"
import * as Configuration from "./Configuration.ts"
import * as Domain from "./Domain.ts"
import * as SharedSemanticModel from "./SemanticModel.ts"

/**
 * The frontend-independent model produced by source analysis.
 *
 * @category models
 * @since 0.6.0
 */
export type SemanticModel = SharedSemanticModel.SemanticModel

/**
 * Analyzes already-discovered public source files in one TypeScript project.
 *
 * @category constructors
 * @since 0.6.0
 */
export const analyzeFiles = (
  files: ReadonlyArray<Domain.SourceFile>,
  packages: ReadonlyArray<{ readonly name: string; readonly root: string }>
) =>
  SharedSemanticModel.fromFiles(files, packages, "source").pipe(
    Effect.mapError((errors) =>
      new Domain.DocgenError({ message: `[source] Unable to analyze TypeScript sources:\n${errors.join("\n")}` })
    )
  )

const specifierFor = (name: string, relative: string): string => {
  const module = relative.replace(/\.[cm]?tsx?$/, "")
  return module === "index" ? name : `${name}/${module}`
}

/**
 * Analyzes one package from its public TypeScript source directory.
 *
 * @category constructors
 * @since 0.6.0
 */
export const analyzePackage = Effect.fnUntraced(function*(root: string) {
  const config = yield* Configuration.Configuration
  const pattern = path.join(root, config.srcDir, "**", "*.ts")
  const paths = yield* Effect.tryPromise({
    try: () => Glob.glob(pattern, { ignore: config.exclude.slice() }),
    catch: (cause) => new Domain.DocgenError({ message: `[source] Unable to discover '${pattern}': ${String(cause)}` })
  })
  const files = paths.sort().map((file) => {
    const relative = path.relative(path.join(root, config.srcDir), file).split(path.sep).join("/")
    const modulePath = [config.srcDir, ...relative.split("/")]
    if (modulePath.length === 0) throw new Error("source module paths must be non-empty")
    return new Domain.SourceFile(
      file,
      modulePath as [string, ...Array<string>],
      [specifierFor(config.projectName, relative)],
      path.relative(root, file).split(path.sep).join("/"),
      config.projectName
    )
  })
  return yield* analyzeFiles(files, [{ name: config.projectName, root }])
})
