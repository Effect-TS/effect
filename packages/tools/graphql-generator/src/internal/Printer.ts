/**
 * Compact printer for executable documents (EFF-1829 point 7, EFF-1831
 * point 7). There is no SDL printer.
 *
 * The signature below is the contract exercised by `test/Printer.test.ts`.
 * The body is a placeholder until the implementation run for EFF-1914 lands.
 *
 * Output rules the tests pin down:
 * - Definitions are printed in the order given, with no trailing newline.
 * - Insignificant whitespace and commas are dropped. A single space is
 *   emitted only between two adjacent tokens that are both non-punctuators
 *   (names, keywords, numbers, strings); the punctuators are
 *   `! $ & ( ) ... : = @ [ ] { | }`.
 * - A `query` operation with no name, variables or directives prints in the
 *   `{ ... }` shorthand.
 * - Every string prints as a regular (non-block) string. `"` and `\` are
 *   escaped, control characters U+0000 to U+001F use `\b \f \n \r \t` or
 *   `\u00XX` with upper-case hex, U+007F prints as `\u007F`, and everything
 *   else is written as-is.
 * - `IntValue` and `FloatValue` print their source text unchanged.
 *
 * @internal
 */
import type * as Ast from "./Ast.ts"

/**
 * Prints an executable document compactly. Documents containing type-system
 * definitions or extensions are outside the contract.
 */
export const print = (_document: Ast.Document): string => {
  throw new Error("@effect/graphql-generator: Printer.print is not implemented yet (EFF-1914)")
}
