/**
 * The one error type every stage of the generator's language front end
 * reports through (EFF-1829 point 6). Lexing and parsing stop at the first
 * diagnostic in a file; later validation collects several.
 *
 * @internal
 */
import * as Data from "effect/Data"

/** A GraphQL document together with the path diagnostics report it under. */
export interface Source {
  readonly path: string
  readonly body: string
}

/**
 * A located error in one GraphQL source file.
 *
 * - `line` and `column` are 1-based. `column` counts UTF-16 code units from
 *   the start of the line, so an astral character earlier on the line counts
 *   as two. An error at end of input points one past the last character.
 * - `message` is the bare message, e.g. `Expected Name, found "}".`, without
 *   the location.
 * - `codeFrame` is the offending line with its neighbours, a `|` gutter with
 *   right-aligned line numbers, and a caret under the column:
 *
 *   ```
 *   1 | query Q {
 *   2 |   a(b: )
 *     |        ^
 *   3 | }
 *   ```
 */
export class Diagnostic extends Data.TaggedError("Diagnostic")<{
  readonly path: string
  readonly line: number
  readonly column: number
  readonly message: string
  readonly codeFrame: string
}> {}

export interface Location {
  readonly line: number
  readonly column: number
}

const lineTerminator = /\r\n|\r|\n/g

/** Splits a body into lines on `\r\n`, `\r` and `\n`. */
export const splitLines = (body: string): ReadonlyArray<string> => body.split(lineTerminator)

/** The 1-based line and UTF-16 column of a code-unit offset into `body`. */
export const locationOf = (body: string, offset: number): Location => {
  let line = 1
  let lineStart = 0
  lineTerminator.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = lineTerminator.exec(body)) !== null && match.index < offset) {
    const terminatorEnd = match.index + match[0].length
    if (terminatorEnd > offset) break
    line++
    lineStart = terminatorEnd
  }
  return { line, column: offset - lineStart + 1 }
}

/** Renders the code frame described on {@link Diagnostic}. */
export const codeFrame = (body: string, location: Location): string => {
  const lines = splitLines(body)
  const first = Math.max(1, location.line - 1)
  const last = Math.min(lines.length, location.line + 1)
  const width = String(last).length
  const out: Array<string> = []
  for (let n = first; n <= last; n++) {
    out.push(`${String(n).padStart(width)} | ${lines[n - 1] ?? ""}`)
    if (n === location.line) {
      out.push(`${" ".repeat(width)} | ${" ".repeat(location.column - 1)}^`)
    }
  }
  return out.join("\n")
}

/** Builds a diagnostic for `message` at a code-unit offset into the source. */
export const make = (source: Source, offset: number, message: string): Diagnostic => {
  const location = locationOf(source.body, offset)
  return new Diagnostic({
    path: source.path,
    line: location.line,
    column: location.column,
    message,
    codeFrame: codeFrame(source.body, location)
  })
}
