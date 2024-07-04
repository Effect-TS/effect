/**
 * @since 0.67.0
 */
import type * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import { dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as serializable_ from "./internal/serializable.js"
import type * as ParseResult from "./ParseResult.js"
import * as Schema from "./Schema.js"

/**
 * @since 0.67.0
 * @category symbol
 */
export const symbol: unique symbol = serializable_.symbol as any

/**
 * The `Serializable` trait, part of the `@effect/schema/Serializable` module,
 * enables objects to have self-contained schema(s) for serialization. This
 * functionality is particularly beneficial in scenarios where objects need to
 * be consistently serialized and deserialized across various runtime
 * environments or sent over network communications.
 *
 * @since 0.67.0
 * @category model
 */
export interface Serializable<A, I, R> {
  readonly [symbol]: Schema.Schema<A, I, R>
}

/**
 * @since 0.67.0
 * @category model
 */
export declare namespace Serializable {
  /**
   * @since 0.68.15
   */
  export type Type<T> = T extends Serializable<infer A, infer _I, infer _R> ? A : never
  /**
   * @since 0.68.15
   */
  export type Encoded<T> = T extends Serializable<infer _A, infer I, infer _R> ? I : never
  /**
   * @since 0.67.0
   */
  export type Context<T> = T extends Serializable<infer _A, infer _I, infer R> ? R : never
}

/**
 * @since 0.67.0
 * @category accessor
 */
export const selfSchema = <A, I, R>(self: Serializable<A, I, R>): Schema.Schema<A, I, R> => self[symbol]

/**
 * @since 0.67.0
 * @category symbol
 */
export const symbolResult: unique symbol = serializable_.symbolResult as any

/**
 * The `WithResult` trait is designed to encapsulate the outcome of an
 * operation, distinguishing between success and failure cases. Each case is
 * associated with a schema that defines the structure and types of the success
 * or failure data.
 *
 * @since 0.67.0
 * @category model
 */
export interface WithResult<Success, SuccessEncoded, Failure, FailureEncoded, SuccessAndFailureR> {
  readonly [symbolResult]: {
    readonly Success: Schema.Schema<Success, SuccessEncoded, SuccessAndFailureR>
    readonly Failure: Schema.Schema<Failure, FailureEncoded, SuccessAndFailureR>
  }
}

/**
 * @since 0.67.0
 * @category model
 */
export declare namespace WithResult {
  /**
   * @since 0.68.16
   */
  export type Success<T> = T extends WithResult<infer _A, infer _I, infer _E, infer _EI, infer _R> ? _A : never

  /**
   * @since 0.68.16
   */
  export type Error<T> = T extends WithResult<infer _A, infer _I, infer _E, infer _EI, infer _R> ? _E : never

  /**
   * @since 0.67.0
   */
  export type Context<T> = T extends WithResult<infer _SA, infer _SI, infer _FA, infer _FI, infer R> ? R : never
}

/**
 * @since 0.67.0
 * @category accessor
 */
export const failureSchema = <SA, SI, FA, FI, R>(self: WithResult<SA, SI, FA, FI, R>): Schema.Schema<FA, FI, R> =>
  self[symbolResult].Failure

/**
 * @since 0.67.0
 * @category accessor
 */
export const successSchema = <SA, SI, FA, FI, R>(self: WithResult<SA, SI, FA, FI, R>): Schema.Schema<SA, SI, R> =>
  self[symbolResult].Success

const exitSchemaCache = globalValue(
  "@effect/schema/Serializable/exitSchemaCache",
  () => new WeakMap<object, Schema.Schema<any, any, any>>()
)

/**
 * @since 0.67.0
 * @category accessor
 */
export const exitSchema = <SA, SI, FA, FI, R>(self: WithResult<SA, SI, FA, FI, R>): Schema.Schema<
  Exit.Exit<SA, FA>,
  Schema.ExitEncoded<SI, FI>,
  R
> => {
  const proto = Object.getPrototypeOf(self)
  if (!(symbolResult in proto)) {
    return Schema.Exit({ failure: failureSchema(self), success: successSchema(self) })
  }
  let schema = exitSchemaCache.get(proto)
  if (schema === undefined) {
    schema = Schema.Exit({ failure: failureSchema(self), success: successSchema(self) })
    exitSchemaCache.set(proto, schema)
  }
  return schema
}

/**
 * @since 0.67.0
 * @category model
 */
export interface SerializableWithResult<
  A,
  I,
  R,
  Success,
  SuccessEncoded,
  Failure,
  FailureEncoded,
  SuccessAndFailureR
> extends Serializable<A, I, R>, WithResult<Success, SuccessEncoded, Failure, FailureEncoded, SuccessAndFailureR> {}

/**
 * @since 0.67.0
 * @category model
 */
export declare namespace SerializableWithResult {
  /**
   * @since 0.67.0
   */
  export type Context<T> = T extends
    SerializableWithResult<infer _S, infer _SI, infer SR, infer _A, infer _AI, infer _E, infer _EI, infer RR> ? SR | RR
    : never
}

/**
 * @since 0.67.0
 * @category encoding
 */
export const serialize = <A, I, R>(self: Serializable<A, I, R>): Effect.Effect<I, ParseResult.ParseError, R> =>
  Schema.encodeUnknown(self[symbol])(self)

/**
 * @since 0.67.0
 * @category decoding
 */
export const deserialize: {
  (value: unknown): <A, I, R>(self: Serializable<A, I, R>) => Effect.Effect<A, ParseResult.ParseError, R>
  <A, I, R>(self: Serializable<A, I, R>, value: unknown): Effect.Effect<A, ParseResult.ParseError, R>
} = dual(
  2,
  <A, I, R>(self: Serializable<A, I, R>, value: unknown): Effect.Effect<A, ParseResult.ParseError, R> =>
    Schema.decodeUnknown(self[symbol])(value)
)

/**
 * @since 0.67.0
 * @category encoding
 */
export const serializeFailure: {
  <FA>(value: FA): <SA, SI, FI, R>(
    self: WithResult<SA, SI, FA, FI, R>
  ) => Effect.Effect<FI, ParseResult.ParseError, R>
  <SA, SI, FA, FI, R>(self: WithResult<SA, SI, FA, FI, R>, value: FA): Effect.Effect<FI, ParseResult.ParseError, R>
} = dual(
  2,
  <SA, SI, FA, FI, R>(self: WithResult<SA, SI, FA, FI, R>, value: FA): Effect.Effect<FI, ParseResult.ParseError, R> =>
    Schema.encode(self[symbolResult].Failure)(value)
)

/**
 * @since 0.67.0
 * @category decoding
 */
export const deserializeFailure: {
  (
    value: unknown
  ): <SA, SI, FA, FI, R>(self: WithResult<SA, SI, FA, FI, R>) => Effect.Effect<FA, ParseResult.ParseError, R>
  <SA, SI, FA, FI, R>(self: WithResult<SA, SI, FA, FI, R>, value: unknown): Effect.Effect<FA, ParseResult.ParseError, R>
} = dual(
  2,
  <SA, SI, FA, FI, R>(
    self: WithResult<SA, SI, FA, FI, R>,
    value: unknown
  ): Effect.Effect<FA, ParseResult.ParseError, R> => Schema.decodeUnknown(self[symbolResult].Failure)(value)
)

/**
 * @since 0.67.0
 * @category encoding
 */
export const serializeSuccess: {
  <SA>(value: SA): <SI, FA, FI, R>(
    self: WithResult<SA, SI, FA, FI, R>
  ) => Effect.Effect<SI, ParseResult.ParseError, R>
  <SA, SI, FA, FI, R>(self: WithResult<SA, SI, FA, FI, R>, value: SA): Effect.Effect<SI, ParseResult.ParseError, R>
} = dual(
  2,
  <SA, SI, FA, FI, R>(self: WithResult<SA, SI, FA, FI, R>, value: SA): Effect.Effect<SI, ParseResult.ParseError, R> =>
    Schema.encode(self[symbolResult].Success)(value)
)

/**
 * @since 0.67.0
 * @category decoding
 */
export const deserializeSuccess: {
  (value: unknown): <SA, SI, FA, FI, R>(
    self: WithResult<SA, SI, FA, FI, R>
  ) => Effect.Effect<SA, ParseResult.ParseError, R>
  <SA, SI, FA, FI, R>(self: WithResult<SA, SI, FA, FI, R>, value: unknown): Effect.Effect<SA, ParseResult.ParseError, R>
} = dual(
  2,
  <SA, SI, FA, FI, R>(
    self: WithResult<SA, SI, FA, FI, R>,
    value: unknown
  ): Effect.Effect<SA, ParseResult.ParseError, R> => Schema.decodeUnknown(self[symbolResult].Success)(value)
)

/**
 * @since 0.67.0
 * @category encoding
 */
export const serializeExit: {
  <SA, FA>(value: Exit.Exit<SA, FA>): <SI, FI, R>(
    self: WithResult<SA, SI, FA, FI, R>
  ) => Effect.Effect<Schema.ExitEncoded<SI, FI>, ParseResult.ParseError, R>
  <SA, SI, FA, FI, R>(
    self: WithResult<SA, SI, FA, FI, R>,
    value: Exit.Exit<SA, FA>
  ): Effect.Effect<Schema.ExitEncoded<SI, FI>, ParseResult.ParseError, R>
} = dual(2, <SA, SI, FA, FI, R>(
  self: WithResult<SA, SI, FA, FI, R>,
  value: Exit.Exit<SA, FA>
): Effect.Effect<Schema.ExitEncoded<SI, FI>, ParseResult.ParseError, R> => Schema.encode(exitSchema(self))(value))

/**
 * @since 0.67.0
 * @category decoding
 */
export const deserializeExit: {
  (value: unknown): <SA, SI, FA, FI, R>(
    self: WithResult<SA, SI, FA, FI, R>
  ) => Effect.Effect<Exit.Exit<SA, FA>, ParseResult.ParseError, R>
  <SA, SI, FA, FI, R>(
    self: WithResult<SA, SI, FA, FI, R>,
    value: unknown
  ): Effect.Effect<Exit.Exit<SA, FA>, ParseResult.ParseError, R>
} = dual(2, <SA, SI, FA, FI, R>(
  self: WithResult<SA, SI, FA, FI, R>,
  value: unknown
): Effect.Effect<Exit.Exit<SA, FA>, ParseResult.ParseError, R> => Schema.decodeUnknown(exitSchema(self))(value))
