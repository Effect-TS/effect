import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { API, type Diagnostic, DiagnosticCategory, type Snapshot } from "typescript/unstable/async"
import type * as Source from "../Source.ts"
import * as Virtual from "./Virtual.ts"

interface ProjectState {
  files: Set<string>
  opened: boolean
  readonly sources: Map<string, Set<string>>
}

interface VirtualSnippet {
  readonly file: string
  readonly snippet: Source.Snippet
  readonly source: string
}

interface CheckRequest {
  readonly file: string
  readonly snippets: ReadonlyArray<Source.Snippet>
  readonly resolve: () => void
  readonly reject: (error: unknown) => void
}

interface ProjectConfiguration {
  readonly key: string
  readonly path: string
}

const projectConfiguration = (file: string, configured?: string | undefined): ProjectConfiguration => {
  if (configured !== undefined) {
    const key = resolve(configured)
    return { key, path: join(dirname(key), ".effect-doctest.tsconfig.json") }
  }

  let directory = dirname(file)
  while (true) {
    const candidate = join(directory, "tsconfig.json")
    if (existsSync(candidate)) {
      return {
        key: candidate,
        path: join(directory, ".effect-doctest.tsconfig.json")
      }
    }
    const parent = dirname(directory)
    if (parent === directory) {
      throw new Error(`Could not find a tsconfig.json for documentation source '${file}'`)
    }
    directory = parent
  }
}

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

const formatDiagnostic = (
  diagnostic: Diagnostic,
  virtualSnippets: ReadonlyMap<string, VirtualSnippet>
): string => {
  const virtual = diagnostic.fileName === undefined ? undefined : virtualSnippets.get(resolve(diagnostic.fileName))
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

export class Typechecker {
  readonly #files = new Map<string, string>()
  readonly #projects = new Map<string, ProjectState>()
  readonly #api = new API({
    cwd: process.cwd(),
    fs: {
      readFile: (file) => this.#files.get(resolve(file)),
      fileExists: (file) => this.#files.has(resolve(file)) ? true : undefined
    }
  })
  #snapshot: Snapshot | undefined
  #queue: Promise<void> = Promise.resolve()
  #pending: Array<CheckRequest> = []
  #timer: ReturnType<typeof setTimeout> | undefined
  #closed: Promise<void> | undefined
  readonly configuredTsconfig: string | undefined

  constructor(configuredTsconfig?: string | undefined) {
    this.configuredTsconfig = configuredTsconfig
  }

  check(file: string, snippets: ReadonlyArray<Source.Snippet>): Promise<void> {
    if (this.#closed !== undefined) {
      return Promise.reject(new Error("Documentation example typechecker is closed"))
    }
    return new Promise((resolveRequest, reject) => {
      this.#pending.push({ file: resolve(file), snippets, resolve: resolveRequest, reject })
      this.#timer ??= setTimeout(() => this.#flush(), 10)
    })
  }

  close(): Promise<void> {
    if (this.#closed !== undefined) return this.#closed
    this.#flush()
    const closed = this.#queue.then(async () => {
      await this.#snapshot?.dispose()
      await this.#api.close()
    })
    this.#queue = closed.catch(() => {})
    this.#closed = closed
    return this.#closed
  }

  #flush(): void {
    if (this.#timer !== undefined) {
      clearTimeout(this.#timer)
      this.#timer = undefined
    }
    if (this.#pending.length === 0) return

    const pending = this.#pending.splice(0)
    while (pending.length > 0) {
      const files = new Set<string>()
      const requests: Array<CheckRequest> = []
      for (let index = 0; index < pending.length;) {
        const request = pending[index]
        if (files.has(request.file)) {
          index++
        } else {
          files.add(request.file)
          requests.push(request)
          pending.splice(index, 1)
        }
      }

      const checked = this.#queue.then(() => this.#check(requests))
      checked.catch((error: unknown) => requests.forEach((request) => request.reject(error)))
      this.#queue = checked.catch(() => {})
    }
  }

  async #check(requests: ReadonlyArray<CheckRequest>): Promise<void> {
    const projects = new Map<string, {
      readonly configuration: ProjectConfiguration
      readonly requests: Array<CheckRequest>
    }>()
    for (const request of requests) {
      const configuration = projectConfiguration(request.file, this.configuredTsconfig)
      const project = projects.get(configuration.key)
      if (project === undefined) projects.set(configuration.key, { configuration, requests: [request] })
      else project.requests.push(request)
    }
    for (const { configuration, requests } of projects.values()) {
      try {
        const diagnostics = await this.#checkProject(configuration, requests)
        for (const request of requests) {
          const errors = [...diagnostics.shared, ...(diagnostics.files.get(request.file) ?? [])]
          if (errors.length === 0) request.resolve()
          else request.reject(new Error(`Documentation example typecheck failed:\n\n${errors.join("\n\n")}`))
        }
      } catch (error) {
        requests.forEach((request) => request.reject(error))
      }
    }
  }

  async #checkProject(
    configuration: ProjectConfiguration,
    requests: ReadonlyArray<CheckRequest>
  ): Promise<{
    readonly shared: ReadonlyArray<string>
    readonly files: ReadonlyMap<string, ReadonlyArray<string>>
  }> {
    const config = configuration.path
    const state = this.#projects.get(configuration.key) ?? {
      files: new Set<string>(),
      opened: false,
      sources: new Map<string, Set<string>>()
    }
    const virtualSnippets = new Map<string, VirtualSnippet>()
    const nextFiles = new Set(state.files)
    const checkedFiles = new Set<string>()
    for (const request of requests) {
      const previousSourceFiles = state.sources.get(request.file) ?? new Set<string>()
      for (const source of previousSourceFiles) nextFiles.delete(source)

      const sourceFiles = new Set<string>()
      request.snippets.forEach((snippet, index) => {
        const source = Virtual.source(request.file, index)
        sourceFiles.add(source)
        checkedFiles.add(source)
        nextFiles.add(source)
        virtualSnippets.set(source, { file: request.file, snippet, source: snippet.source })
      })
      state.sources.set(request.file, sourceFiles)
    }

    const deleted = [...state.files].filter((source) => !nextFiles.has(source))

    for (const source of deleted) this.#files.delete(source)
    for (const [source, virtual] of virtualSnippets) this.#files.set(source, virtual.source)
    this.#files.set(
      config,
      JSON.stringify({
        extends: configuration.key,
        include: [],
        files: [...nextFiles],
        compilerOptions: {
          composite: false,
          declaration: false,
          declarationMap: false,
          incremental: false,
          noEmit: true,
          noUnusedLocals: false,
          noUnusedParameters: false,
          moduleDetection: "force",
          rootDir: dirname(configuration.key)
        }
      })
    )

    const previous = this.#snapshot
    const snapshot = await this.#api.updateSnapshot(
      state.opened
        ? { fileChanges: { invalidateAll: true } }
        : { openProjects: [config] }
    )
    this.#snapshot = snapshot
    await previous?.dispose()
    state.files = nextFiles
    state.opened = true
    this.#projects.set(configuration.key, state)

    const project = snapshot.getProject(config)
    if (project === undefined) {
      throw new Error(`TypeScript did not load virtual documentation project '${config}'`)
    }

    const diagnostics = [
      ...await project.program.getConfigFileParsingDiagnostics(),
      ...await project.program.getProgramDiagnostics(),
      ...await project.program.getGlobalDiagnostics()
    ]
    const sourceDiagnostics = [
      ...await project.program.getSyntacticDiagnostics(),
      ...await project.program.getBindDiagnostics(),
      ...await project.program.getSemanticDiagnostics()
    ]
    diagnostics.push(
      ...sourceDiagnostics.filter((diagnostic) =>
        diagnostic.fileName !== undefined && checkedFiles.has(resolve(diagnostic.fileName))
      )
    )

    const errors = diagnostics.filter((diagnostic) => diagnostic.category === DiagnosticCategory.Error)
    const shared: Array<string> = []
    const files = new Map<string, Array<string>>()
    for (const diagnostic of errors) {
      const virtual = diagnostic.fileName === undefined ? undefined : virtualSnippets.get(resolve(diagnostic.fileName))
      const formatted = formatDiagnostic(diagnostic, virtualSnippets)
      if (virtual === undefined) {
        shared.push(formatted)
      } else {
        const fileDiagnostics = files.get(virtual.file)
        if (fileDiagnostics === undefined) files.set(virtual.file, [formatted])
        else fileDiagnostics.push(formatted)
      }
    }
    return { shared, files }
  }
}
