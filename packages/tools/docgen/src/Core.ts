/**
 * @since 0.6.0
 */

import * as NodeServices from "@effect/platform-node/NodeServices"
import * as WorkspaceInventory from "@effect/workspace/Workspace"
import chalk from "chalk"
import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import * as Glob from "glob"
import * as Checker from "./Checker.ts"
import * as Configuration from "./Configuration.ts"
import * as DeclarationFrontend from "./DeclarationFrontend.ts"
import * as Documentation from "./Documentation.ts"
import * as Domain from "./Domain.ts"
import type { DocumentationFrontend } from "./Frontend.ts"
import * as JsonOutput from "./JsonOutput.ts"
import type * as SemanticModel from "./SemanticModel.ts"
import * as SourceFrontend from "./SourceFrontend.ts"
import * as DocgenWorkspace from "./Workspace.ts"

const validate = (model: SemanticModel.SemanticModel) =>
  Effect.gen(function*() {
    if (model.diagnostics.length > 0) yield* Effect.logWarning(model.diagnostics.join("\n"))
    yield* Effect.logInfo("Checking modules...")
    const errors = yield* Checker.checkModules(model.modules)
    if (errors.length > 0) {
      return yield* new Domain.DocgenError({
        message: `The following errors occurred while checking the modules:\n\n${errors.join("\n\n")}`
      })
    }
  })

interface PackageContext {
  readonly name: string
  readonly root: string
  readonly config: Configuration.ConfigurationShape
  readonly files: ReadonlyArray<Domain.SourceFile>
}

const runFrontend = <R>(frontend: DocumentationFrontend<R>) => frontend.analyze

const compile = Effect.fnUntraced(function*(packages: ReadonlyArray<PackageContext>) {
  const files = packages.flatMap((pkg) => pkg.files)
  yield* Effect.logInfo(`Parsing ${files.length} source file(s) from ${packages.length} package(s)...`)
  return yield* SourceFrontend.analyzeFiles(files, packages)
})

const project = Effect.fnUntraced(function*(
  model: SemanticModel.SemanticModel,
  packages: ReadonlyArray<PackageContext>,
  options: { readonly jsonFile?: string | undefined; readonly validateOnly?: boolean }
) {
  const config = yield* Configuration.Configuration
  yield* validate(model)
  if (options.validateOnly) {
    yield* Effect.logInfo(chalk.bold.green("✓ Docs validation succeeded!"))
    return
  }
  if (config.generateDocs) {
    yield* Effect.logInfo("Generating Markdown documentation...")
    for (const pkg of packages) {
      yield* Documentation.write(model, pkg.name).pipe(
        Effect.provideService(Configuration.Configuration, pkg.config),
        Effect.mapError((error) => new Domain.DocgenError({ message: `[${pkg.name}] ${error.message}` }))
      )
    }
  }
  if (options.jsonFile !== undefined) {
    yield* Effect.logInfo("Generating JSON semantic model...")
    yield* JsonOutput.write(model, options.jsonFile)
  }
  yield* Effect.logInfo(chalk.bold.green("✓ Docs generation succeeded!"))
})

const nonWorkspacePackages = Effect.gen(function*() {
  const config = yield* Configuration.Configuration
  const process = yield* Domain.Process
  const cwd = yield* process.cwd
  const path = yield* Path.Path
  const pattern = path.normalize(path.join(config.srcDir, "**", "*.ts"))
  const paths = yield* Effect.tryPromise(() => Glob.glob(pattern, { ignore: config.exclude.slice() })).pipe(
    Effect.mapError(() => new Domain.DocgenError({ message: `[Core] Unable to execute glob pattern '${pattern}'` }))
  )
  const files = paths.flatMap((filePath) => {
    const modulePath = filePath.split(path.sep)
    return Array.isArrayNonEmpty(modulePath)
      ? [new Domain.SourceFile(filePath, modulePath, [filePath], undefined, config.projectName)]
      : []
  })
  return [{ name: config.projectName, root: cwd, config, files }]
})

const workspacePackages = Effect.fnUntraced(function*(options: {
  readonly packages?: ReadonlyArray<string>
  readonly paths?: ReadonlyArray<string>
}) {
  const config = yield* Configuration.Configuration
  const process = yield* Domain.Process
  const cwd = yield* process.cwd
  const path = yield* Path.Path
  if (path.isAbsolute(config.outDir)) {
    return yield* new Domain.DocgenError({ message: "Workspace documentation output directory must be relative" })
  }
  const analysis = yield* WorkspaceInventory.analyze({ cwd, sourceDirectory: config.srcDir }).pipe(
    Effect.mapError((error) =>
      new Domain.DocgenError({
        message: `[Core.workspaceProgram] Unable to analyze workspace:\n${error.diagnostics.join("\n")}`
      })
    )
  )
  const scopedOptions = DocgenWorkspace.scopeToCwd(analysis, cwd, options)
  const discovered = yield* DocgenWorkspace.fromAnalysis(analysis)
  const excluded = config.exclude.length === 0
    ? new Set<string>()
    : new Set((yield* Effect.tryPromise(() =>
      Glob.glob(config.exclude.slice(), {
        cwd: analysis.root,
        absolute: true
      })
    ).pipe(Effect.orDie)).map(globalThis.String))
  const available = discovered.map((pkg) => ({
    ...pkg,
    files: pkg.files.filter((file) => !excluded.has(file.path))
  }))
  const selected = yield* DocgenWorkspace.select(available, scopedOptions)
  return selected.map((pkg) => ({
    name: pkg.name,
    root: pkg.root,
    config: Configuration.forPackage(config, pkg, analysis.root),
    files: pkg.files
  }))
})

const compileDeclarations = Effect.fnUntraced(function*(options: {
  readonly packages?: ReadonlyArray<string>
  readonly paths?: ReadonlyArray<string>
}) {
  const config = yield* Configuration.Configuration
  const process = yield* Domain.Process
  const cwd = yield* process.cwd
  if (!config.workspace) return yield* DeclarationFrontend.analyzePackage(cwd)
  const analysis = yield* WorkspaceInventory.analyze({ cwd, sourceDirectory: config.srcDir }).pipe(
    Effect.mapError((error) =>
      new Domain.DocgenError({
        message: `[declaration] Unable to analyze workspace:\n${error.diagnostics.join("\n")}`
      })
    )
  )
  return yield* DeclarationFrontend.analyzeWorkspace(analysis, DocgenWorkspace.scopeToCwd(analysis, cwd, options))
})

/** @internal */
export const analyze = (options: {
  readonly packages?: ReadonlyArray<string>
  readonly paths?: ReadonlyArray<string>
} = {}) =>
  Effect.gen(function*() {
    const config = yield* Configuration.Configuration
    const sourcePackages = config.frontend === "source"
      ? config.workspace ? yield* workspacePackages(options) : yield* nonWorkspacePackages
      : undefined
    return sourcePackages === undefined
      ? yield* runFrontend({ analyze: compileDeclarations(options) })
      : yield* runFrontend({ analyze: compile(sourcePackages) })
  })

/**
 * Analyzes documentation sources with the Node.js runtime services.
 *
 * @category constructors
 * @since 0.6.0
 */
export const analyzeWithNode = (
  config: Configuration.ConfigurationShape,
  options: {
    readonly packages?: ReadonlyArray<string>
    readonly paths?: ReadonlyArray<string>
  } = {}
): Promise<SemanticModel.SemanticModel> =>
  Effect.runPromise(
    analyze(options).pipe(
      Effect.provideService(Configuration.Configuration, config),
      Effect.provide(Layer.mergeAll(Domain.Process.layer, NodeServices.layer))
    )
  )

/** @internal */
export const program = (options: {
  readonly jsonFile?: string | undefined
  readonly packages?: ReadonlyArray<string>
  readonly paths?: ReadonlyArray<string>
  readonly validateOnly?: boolean
} = {}) =>
  Effect.gen(function*() {
    const config = yield* Configuration.Configuration
    const hasFilters = (options.packages?.length ?? 0) > 0 || (options.paths?.length ?? 0) > 0
    if (hasFilters && !options.validateOnly) {
      return yield* new Domain.DocgenError({ message: "Package and path filters require --validate" })
    }
    if (hasFilters && !config.workspace) {
      return yield* new Domain.DocgenError({ message: "Package and path filters require workspace mode" })
    }
    const model = yield* analyze(options)
    const process = yield* Domain.Process
    const cwd = yield* process.cwd
    const packages = model.packages.map((pkg) => ({
      name: pkg.name,
      root: pkg.root,
      config: config.workspace ? Configuration.forPackage(config, pkg, cwd) : config,
      files: []
    }))
    return yield* project(model, packages, options)
  })
