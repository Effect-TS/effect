import type { ParseOptions } from "@effect/schema/AST"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import { RpcDecodeFailure, RpcEncodeFailure } from "../Error.js"

/** @internal */
export const decode = <R, I, A>(schema: Schema.Schema<R, I, A>) => {
  const decode = Schema.decodeUnknown(schema)
  return (input: unknown): Effect.Effect<R, RpcDecodeFailure, A> =>
    Effect.mapError(decode(input, { errors: "all" }), (error) => RpcDecodeFailure({ error: error.error }))
}

/** @internal */
export const encode: <R, I, A>(
  schema: Schema.Schema<R, I, A>
) => (input: A, options?: ParseOptions | undefined) => Effect.Effect<R, RpcEncodeFailure, I> = <R, I, A>(
  schema: Schema.Schema<R, I, A>
) => {
  const encode = Schema.encode(schema)
  return (input: A) =>
    Effect.mapError(encode(input, { errors: "all" }), (error) => RpcEncodeFailure({ error: error.error }))
}
