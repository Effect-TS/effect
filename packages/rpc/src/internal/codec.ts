import type { ParseOptions } from "@effect/schema/AST"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { RpcDecodeFailure, RpcEncodeFailure } from "../Error.js"

/** @internal */
export const decodeEither = <I, A>(schema: Schema.Schema<I, A>) => {
  const decode = Schema.parseEither(schema)
  return (input: unknown): Either.Either<RpcDecodeFailure, A> =>
    Either.mapLeft(decode(input, { errors: "all" }), (error) => RpcDecodeFailure({ errors: error.errors }))
}

/** @internal */
export const decode = <I, A>(schema: Schema.Schema<I, A>) => {
  const decode = Schema.parse(schema)
  return (input: unknown): Effect.Effect<never, RpcDecodeFailure, A> =>
    Effect.mapError(decode(input, { errors: "all" }), (error) => RpcDecodeFailure({ errors: error.errors }))
}

/** @internal */
export const encode: <I, A>(
  schema: Schema.Schema<I, A>
) => (input: A, options?: ParseOptions | undefined) => Effect.Effect<never, RpcEncodeFailure, I> = <I, A>(
  schema: Schema.Schema<I, A>
) => {
  const encode = Schema.encode(schema)
  return (input: A) =>
    Effect.mapError(encode(input, { errors: "all" }), (error) => RpcEncodeFailure({ errors: error.errors }))
}

/** @internal */
export const encodeEither: <I, A>(
  schema: Schema.Schema<I, A>
) => (input: A, options?: ParseOptions | undefined) => Either.Either<RpcEncodeFailure, I> = <I, A>(
  schema: Schema.Schema<I, A>
) => {
  const encode = Schema.encodeEither(schema)
  return (input: A) =>
    Either.mapLeft(encode(input, { errors: "all" }), (error) => RpcEncodeFailure({ errors: error.errors }))
}
