/**
 * Builds a {@link SchemaModel.Schema} from a parsed type-system document
 * (EFF-1829 points 3 and 4).
 *
 * The signature below is the contract exercised by `test/*.test.ts`. The body
 * is a placeholder until the implementation run for EFF-1915 lands; every test
 * that reaches it fails with the error thrown here.
 *
 * @internal
 */
import type * as Result from "effect/Result"
import type * as Ast from "./Ast.ts"
import type { Diagnostic, Source } from "./Diagnostic.ts"
import type * as SchemaModel from "./SchemaModel.ts"

/**
 * Reads every definition and `extend` form in `document`, merging extensions
 * into their base definitions in document order. Root operation types come
 * from `schema { ... }` and `extend schema`, or default to the types named
 * `Query`, `Mutation` and `Subscription` when there is no schema definition.
 * Executable definitions are ignored.
 *
 * Fails with a diagnostic located in `source` when the document cannot form a
 * schema, e.g. it has no query root type or extends a type it never defines.
 * The server schema is not otherwise validated.
 */
export const read = (_source: Source, _document: Ast.Document): Result.Result<SchemaModel.Schema, Diagnostic> => {
  throw new Error("@effect/graphql-generator: SdlReader.read is not implemented yet (EFF-1915)")
}
