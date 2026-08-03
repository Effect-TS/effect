import * as Effect from "effect/Effect"
import * as Path from "effect/Path"
import * as Ref from "effect/Ref"
import type * as Source from "../Source.ts"
import { DoctestError, fromUnknown } from "./DoctestError.ts"
import { OxlintLsp } from "./OxlintLsp.ts"
import * as Virtual from "./Virtual.ts"

interface Example {
  readonly file: string
  readonly snippets: ReadonlyArray<Source.Snippet>
}

interface Diagnostic {
  readonly range: {
    readonly start: {
      readonly line: number
      readonly character: number
    }
  }
  readonly severity?: number
  readonly code?: string | number
  readonly message: string
}

interface DiagnosticReport {
  readonly items: ReadonlyArray<Diagnostic>
}

const diagnosticHeader = "Documentation example lint failed:\n\n"

const formatDiagnostic = (file: string, snippet: Source.Snippet, diagnostic: Diagnostic): string => {
  const line = snippet.line + diagnostic.range.start.line + 1
  const column = snippet.column + diagnostic.range.start.character
  const code = diagnostic.code === undefined ? "oxlint" : String(diagnostic.code)
  return `${file}:${line}:${column} ${code}: ${diagnostic.message.replaceAll("\n", "\n  ")}`
}

export const check = Effect.fnUntraced(function*(examples: ReadonlyArray<Example>) {
  const path = yield* Path.Path
  const lsp = yield* OxlintLsp
  const nextVersion = yield* Ref.make(1)
  const diagnostics = yield* Effect.forEach(
    examples,
    ({ file, snippets }) =>
      Effect.forEach(
        snippets,
        Effect.fnUntraced(function*(snippet, index) {
          const uri = (yield* path.toFileUrl(Virtual.source(path.resolve(file), index)).pipe(
            Effect.mapError((cause) => fromUnknown(cause))
          )).href
          const version = yield* Ref.getAndUpdate(nextVersion, (version) => version + 1)
          yield* lsp.notify("textDocument/didOpen", {
            textDocument: {
              uri,
              languageId: "typescript",
              version,
              text: snippet.source
            }
          })
          const report = yield* lsp.request<DiagnosticReport>("textDocument/diagnostic", {
            textDocument: { uri }
          }).pipe(
            Effect.ensuring(Effect.ignore(lsp.notify("textDocument/didClose", { textDocument: { uri } })))
          )
          return report.items.map((diagnostic) => ({ diagnostic, file, snippet }))
        }),
        { concurrency: "unbounded" }
      ),
    { concurrency: "unbounded" }
  )
  const errors = diagnostics.flat(2).filter(({ diagnostic }) => diagnostic.severity === 1)
  if (errors.length > 0) {
    return yield* new DoctestError({
      message: `${diagnosticHeader}${
        errors.map(({ diagnostic, file, snippet }) => formatDiagnostic(file, snippet, diagnostic)).join("\n\n")
      }`
    })
  }
})
