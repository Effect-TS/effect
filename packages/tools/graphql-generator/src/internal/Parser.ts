/**
 * GraphQL parser: `Source` to {@link Ast.Document}.
 *
 * The signatures below are the contract exercised by `test/*.test.ts`. The
 * bodies are placeholders until the implementation run for EFF-1914 lands;
 * every test that reaches them fails with the error thrown here.
 *
 * @internal
 */
import type * as Result from "effect/Result"
import type * as Ast from "./Ast.ts"
import type { Diagnostic, Source } from "./Diagnostic.ts"

/**
 * Parses a complete document, executable or type-system, covering the full
 * grammar of the current spec edition. Fails with the first lexical or
 * syntactic error; there is no recovery.
 */
export const parse = (_source: Source): Result.Result<Ast.Document, Diagnostic> => {
  throw new Error("@effect/graphql-generator: Parser.parse is not implemented yet (EFF-1914)")
}

/**
 * Parses a single `Value[Const]` that spans the whole source, as found in
 * introspection `defaultValue` strings. Variables and trailing tokens are
 * errors.
 */
export const parseConstValue = (_source: Source): Result.Result<Ast.ConstValue, Diagnostic> => {
  throw new Error("@effect/graphql-generator: Parser.parseConstValue is not implemented yet (EFF-1914)")
}
