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
