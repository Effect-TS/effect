/**
 * Builds a {@link SchemaModel.Schema} directly from introspection JSON
 * (EFF-1829 point 3), without printing SDL and re-parsing it.
 *
 * The signature below is the contract exercised by `test/*.test.ts`. The body
 * is a placeholder until the implementation run for EFF-1915 lands; every test
 * that reaches it fails with the error thrown here.
 *
 * @internal
 */
import type * as Result from "effect/Result"
import type { Diagnostic, Source } from "./Diagnostic.ts"
import type * as SchemaModel from "./SchemaModel.ts"

/**
 * Reads introspection JSON from `source.body`, accepting both `{ __schema }`
 * and `{ data: { __schema } }`. `defaultValue` strings go through
 * `Parser.parseConstValue`. The newer keys `isRepeatable`, `specifiedByURL`,
 * `isOneOf` and input value `isDeprecated` / `deprecationReason` are optional
 * and read as `false` / absent when missing. `isDeprecated: true` with a
 * `null` reason reads as `"No longer supported"`.
 *
 * Fails with a diagnostic for `source.path` when the body is not JSON, has
 * neither shape, or a `defaultValue` does not parse.
 */
export const read = (_source: Source): Result.Result<SchemaModel.Schema, Diagnostic> => {
  throw new Error("@effect/graphql-generator: IntrospectionReader.read is not implemented yet (EFF-1915)")
}
