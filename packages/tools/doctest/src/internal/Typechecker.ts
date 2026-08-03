import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import * as Semaphore from "effect/Semaphore"
import { API, type Diagnostic, DiagnosticCategory, type Snapshot } from "typescript/unstable/async"
import type * as Source from "../Source.ts"
import { DoctestError, fromUnknown } from "./DoctestError.ts"
import * as Virtual from "./Virtual.ts"

interface Example {
  readonly file: string
  readonly snippets: ReadonlyArray<Source.Snippet>
}

interface VirtualSnippet {
  readonly file: string
  readonly snippet: Source.Snippet
  readonly source: string
}

interface ProjectConfiguration {
  readonly key: string
  readonly path: string
}

const diagnosticHeader = "Documentation example typecheck failed:\n\n"

const sourceLocation = (source: string, offset: number): { readonly line: number; readonly column: number } => {
  let line = 1
  let column = 1
  for (let index = 0; index < offset; index++) {
    if (source.charCodeAt(index) === 10) {
      line++
      column = 1
    } else {
      column++
    }
  }
  return { line, column }
}

const message = (diagnostic: Diagnostic): string => {
  const details = diagnostic.messageChain?.map(message) ?? []
  return [diagnostic.text, ...details.map((detail) => `  ${detail.replaceAll("\n", "\n  ")}`)].join("\n")
}

export class Typechecker extends Context.Service<Typechecker, {
  readonly check: (examples: ReadonlyArray<Example>) => Effect.Effect<void, DoctestError>
}>()("@effect/doctest/Typechecker") {}

const make = Effect.fnUntraced(function*(configuredTsconfig: string | undefined) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const semaphore = yield* Semaphore.make(1)
  const files = new Map<string, string>()
  const api = new API({
    cwd: path.resolve(),
    fs: {
      readFile: (file) => files.get(path.resolve(file)),
      fileExists: (file) => files.has(path.resolve(file)) ? true : undefined
    }
  })
  let snapshot: Snapshot | undefined
  const openedProjects = new Set<string>()
  const promise = <A>(evaluate: () => Promise<A>) =>
    Effect.tryPromise({
      try: evaluate,
      catch: (cause) => fromUnknown(cause)
    })
  const projectConfiguration = Effect.fnUntraced(function*(file: string) {
    if (configuredTsconfig !== undefined) {
      const key = path.resolve(configuredTsconfig)
      return { key, path: path.join(path.dirname(key), ".effect-doctest.tsconfig.json") }
    }

    let directory = path.dirname(file)
    while (true) {
      const candidate = path.join(directory, "tsconfig.json")
      if (yield* fs.exists(candidate).pipe(Effect.mapError((cause) => fromUnknown(cause)))) {
        return { key: candidate, path: path.join(directory, ".effect-doctest.tsconfig.json") }
      }
      const parent = path.dirname(directory)
      if (parent === directory) {
        return yield* new DoctestError({
          message: `Could not find a tsconfig.json for documentation source '${file}'`
        })
      }
      directory = parent
    }
  })
  const formatDiagnostic = (diagnostic: Diagnostic, virtualSnippets: ReadonlyMap<string, VirtualSnippet>): string => {
    const virtual = diagnostic.fileName === undefined
      ? undefined
      : virtualSnippets.get(path.resolve(diagnostic.fileName))
    if (virtual !== undefined) {
      const location = sourceLocation(virtual.source, diagnostic.pos)
      const column = virtual.snippet.column + location.column - 1
      return `${virtual.file}:${virtual.snippet.line + location.line}:${column} TS${diagnostic.code}: ${
        message(diagnostic)
      }`
    }

    const location = diagnostic.fileName === undefined ? "" : `${diagnostic.fileName}: `
    return `${location}TS${diagnostic.code}: ${message(diagnostic)}`
  }

  yield* Effect.addFinalizer(() =>
    (snapshot === undefined ? Effect.void : promise(() => snapshot!.dispose())).pipe(
      Effect.timeout("5 seconds"),
      Effect.ignore,
      Effect.ensuring(
        promise(() => api.close()).pipe(
          Effect.timeout("5 seconds"),
          Effect.ignore
        )
      )
    )
  )

  const check = Effect.fnUntraced(function*(examples: ReadonlyArray<Example>) {
    const projects = new Map<string, {
      readonly configuration: ProjectConfiguration
      readonly examples: Array<Example>
    }>()
    for (const example of examples) {
      const normalized = { ...example, file: path.resolve(example.file) }
      const configuration = yield* projectConfiguration(normalized.file)
      const project = projects.get(configuration.key)
      if (project === undefined) projects.set(configuration.key, { configuration, examples: [normalized] })
      else project.examples.push(normalized)
    }

    const failures: Array<string> = []
    for (const { configuration, examples } of projects.values()) {
      const config = configuration.path
      const virtualSnippets = new Map<string, VirtualSnippet>()
      const checkedFiles = new Set<string>()
      const sourceFiles: Array<string> = []
      for (const example of examples) {
        example.snippets.forEach((snippet, index) => {
          const source = Virtual.source(example.file, index)
          sourceFiles.push(source)
          checkedFiles.add(source)
          virtualSnippets.set(source, { file: example.file, snippet, source: snippet.source })
          files.set(source, snippet.source)
        })
      }
      files.set(
        config,
        JSON.stringify({
          extends: configuration.key,
          include: [],
          files: sourceFiles,
          compilerOptions: {
            composite: false,
            declaration: false,
            declarationMap: false,
            incremental: false,
            noEmit: true,
            noUnusedLocals: false,
            noUnusedParameters: false,
            moduleDetection: "force",
            rootDir: path.dirname(configuration.key)
          }
        })
      )

      const previous = snapshot
      snapshot = yield* promise(() =>
        api.updateSnapshot(
          openedProjects.has(config)
            ? { fileChanges: { invalidateAll: true } }
            : { openProjects: [config] }
        )
      )
      openedProjects.add(config)
      if (previous !== undefined) yield* promise(() => previous.dispose())
      const project = snapshot.getProject(config)
      if (project === undefined) {
        return yield* new DoctestError({
          message: `TypeScript did not load virtual documentation project '${config}'`
        })
      }

      const diagnostics = [
        ...yield* promise(() => project.program.getConfigFileParsingDiagnostics()),
        ...yield* promise(() => project.program.getProgramDiagnostics()),
        ...yield* promise(() => project.program.getGlobalDiagnostics())
      ]
      const sourceDiagnostics = [
        ...yield* promise(() => project.program.getSyntacticDiagnostics()),
        ...yield* promise(() => project.program.getBindDiagnostics()),
        ...yield* promise(() => project.program.getSemanticDiagnostics())
      ]
      diagnostics.push(
        ...sourceDiagnostics.filter((diagnostic) =>
          diagnostic.fileName !== undefined && checkedFiles.has(path.resolve(diagnostic.fileName))
        )
      )

      const shared: Array<string> = []
      const diagnosticsByFile = new Map<string, Array<string>>()
      for (const diagnostic of diagnostics) {
        if (diagnostic.category !== DiagnosticCategory.Error) continue
        const virtual = diagnostic.fileName === undefined
          ? undefined
          : virtualSnippets.get(path.resolve(diagnostic.fileName))
        const formatted = formatDiagnostic(diagnostic, virtualSnippets)
        if (virtual === undefined) {
          shared.push(formatted)
        } else {
          const fileDiagnostics = diagnosticsByFile.get(virtual.file)
          if (fileDiagnostics === undefined) diagnosticsByFile.set(virtual.file, [formatted])
          else fileDiagnostics.push(formatted)
        }
      }
      for (const example of examples) {
        const errors = [...shared, ...(diagnosticsByFile.get(example.file) ?? [])]
        if (errors.length > 0) failures.push(errors.join("\n\n"))
      }
    }

    if (failures.length > 0) {
      return yield* new DoctestError({
        message: `${diagnosticHeader}${failures.join("\n\n")}`
      })
    }
  })

  return Typechecker.of({
    check: (examples) => semaphore.withPermits(1)(check(examples))
  })
})

export const layer = (configuredTsconfig: string | undefined): Layer.Layer<
  Typechecker,
  never,
  FileSystem.FileSystem | Path.Path
> => Layer.effect(Typechecker, make(configuredTsconfig))
