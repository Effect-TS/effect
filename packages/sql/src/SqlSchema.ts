/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import type * as Option from "effect/Option"
import type { ParseError } from "effect/ParseResult"
import * as Schema from "effect/Schema"

/**
 * Run a sql query with a request schema and a result schema.
 *
 * @since 1.0.0
 * @category constructor
 */
export const findAll = <IR, II, IA, AR, AI, A, R, E>(
  options: {
    readonly Request: Schema.Schema<IA, II, IR>
    readonly Result: Schema.Schema<A, AI, AR>
    readonly execute: (request: II) => Effect.Effect<ReadonlyArray<unknown>, E, R>
  }
) => {
  const encodeRequest = Schema.encode(options.Request)
  const decode = Schema.decodeUnknown(Schema.Array(options.Result))
  return (request: IA): Effect.Effect<ReadonlyArray<A>, E | ParseError, R | IR | AR> =>
    Effect.flatMap(
      Effect.flatMap(encodeRequest(request), options.execute),
      decode
    )
}

const void_ = <IR, II, IA, R, E>(
  options: {
    readonly Request: Schema.Schema<IA, II, IR>
    readonly execute: (request: II) => Effect.Effect<unknown, E, R>
  }
) => {
  const encode = Schema.encode(options.Request)
  return (request: IA): Effect.Effect<void, E | ParseError, R | IR> =>
    Effect.asVoid(
      Effect.flatMap(encode(request), options.execute)
    )
}
export {
  /**
   * Run a sql query with a request schema and discard the result.
   *
   * @since 1.0.0
   * @category constructor
   */
  void_ as void
}

/**
 * Run a sql query with a request schema and a result schema and return the first result.
 *
 * @since 1.0.0
 * @category constructor
 */
export const findOne = <IR, II, IA, AR, AI, A, R, E>(
  options: {
    readonly Request: Schema.Schema<IA, II, IR>
    readonly Result: Schema.Schema<A, AI, AR>
    readonly execute: (request: II) => Effect.Effect<ReadonlyArray<unknown>, E, R>
  }
) => {
  const encodeRequest = Schema.encode(options.Request)
  const decode = Schema.decodeUnknown(options.Result)
  return (request: IA): Effect.Effect<Option.Option<A>, E | ParseError, R | IR | AR> =>
    Effect.flatMap(
      Effect.flatMap(encodeRequest(request), options.execute),
      (arr) => Array.isArray(arr) && arr.length > 0 ? Effect.asSome(decode(arr[0])) : Effect.succeedNone
    )
}

/**
 * Run a sql query with a request schema and a result schema and return the first result.
 *
 * @since 1.0.0
 * @category constructor
 */
export const single = <IR, II, IA, AR, AI, A, R, E>(
  options: {
    readonly Request: Schema.Schema<IA, II, IR>
    readonly Result: Schema.Schema<A, AI, AR>
    readonly execute: (request: II) => Effect.Effect<ReadonlyArray<unknown>, E, R>
  }
) => {
  const encodeRequest = Schema.encode(options.Request)
  const decode = Schema.decodeUnknown(options.Result)
  return (request: IA): Effect.Effect<A, E | ParseError | Cause.NoSuchElementException, R | IR | AR> =>
    Effect.flatMap(
      Effect.flatMap(encodeRequest(request), options.execute),
      (arr): Effect.Effect<A, ParseError | Cause.NoSuchElementException, AR> =>
        Array.isArray(arr) && arr.length > 0 ? decode(arr[0]) : Effect.fail(new Cause.NoSuchElementException())
    )
}
