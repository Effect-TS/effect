import type { ParseOptions } from "@effect/schema/AST"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import { RpcDecodeFailure, RpcEncodeFailure } from "../Error.js"

/** @internal */
export const decode = <A, I, R>(schema: Schema.Schema<A, I, R>) => {
  const decode = Schema.decodeUnknown(schema)
  return (input: unknown): Effect.Effect<A, RpcDecodeFailure, R> =>
    Effect.mapError(decode(input, { errors: "all" }), (error) => RpcDecodeFailure({ error: error.error }))
}

/** @internal */
export const encode: <A, I, R>(
  schema: Schema.Schema<A, I, R>
) => (input: A, options?: ParseOptions | undefined) => Effect.Effect<I, RpcEncodeFailure, R> = <A, I, R>(
  schema: Schema.Schema<A, I, R>
) => {
  const encode = Schema.encode(schema)
  return (input: A) =>
    Effect.mapError(encode(input, { errors: "all" }), (error) => RpcEncodeFailure({ error: error.error }))
}
