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

// ---------------------------------------------
// Serializable
// ---------------------------------------------

/**
 * @since 0.67.0
 * @category symbol
 */
export const symbol: unique symbol = serializable_.symbol as any

/**
 * The `Serializable` trait allows objects to define their own schema for
 * serialization.
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
  /**
   * @since 0.69.0
   */
  export type Any = Serializable<any, any, unknown>
  /**
   * @since 0.69.0
   */
  export type All =
    | Any
    | Serializable<any, never, unknown>
    | Serializable<never, any, unknown>
    | Serializable<never, never, unknown>
}

/**
 * @since 0.69.0
 */
export const asSerializable = <S extends Serializable.All>(
  serializable: S
): Serializable<Serializable.Type<S>, Serializable.Encoded<S>, Serializable.Context<S>> => serializable as any

/**
 * @since 0.67.0
 * @category accessor
 */
export const selfSchema = <A, I, R>(self: Serializable<A, I, R>): Schema.Schema<A, I, R> => self[symbol]

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

// ---------------------------------------------
// WithResult
// ---------------------------------------------

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
export interface WithResult<Success, SuccessEncoded, Failure, FailureEncoded, ResultR> {
  readonly [symbolResult]: {
    readonly success: Schema.Schema<Success, SuccessEncoded, ResultR>
    readonly failure: Schema.Schema<Failure, FailureEncoded, ResultR>
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
   * @since 0.69.0
   */
  export type SuccessEncoded<T> = T extends WithResult<infer _A, infer _I, infer _E, infer _EI, infer _R> ? _I : never
  /**
   * @since 0.69.0
   */
  export type Failure<T> = T extends WithResult<infer _A, infer _I, infer _E, infer _EI, infer _R> ? _E : never
  /**
   * @since 0.69.0
   */
  export type FailureEncoded<T> = T extends WithResult<infer _A, infer _I, infer _E, infer _EI, infer _R> ? _EI : never

  /**
   * @since 0.67.0
   */
  export type Context<T> = T extends WithResult<infer _SA, infer _SI, infer _FA, infer _FI, infer R> ? R : never
  /**
   * @since 0.69.0
   */
  export type Any = WithResult<any, any, any, any, unknown>
  /**
   * @since 0.69.0
   */
  export type All =
    | Any
    | WithResult<any, any, never, never, unknown>
}

/**
 * @since 0.69.0
 */
export const asWithResult = <WR extends WithResult.All>(
  withExit: WR
): WithResult<
  WithResult.Success<WR>,
  WithResult.SuccessEncoded<WR>,
  WithResult.Failure<WR>,
  WithResult.FailureEncoded<WR>,
  WithResult.Context<WR>
> => withExit as any

/**
 * @since 0.67.0
 * @category accessor
 */
export const failureSchema = <SA, SI, FA, FI, R>(self: WithResult<SA, SI, FA, FI, R>): Schema.Schema<FA, FI, R> =>
  self[symbolResult].failure

/**
 * @since 0.67.0
 * @category accessor
 */
export const successSchema = <SA, SI, FA, FI, R>(self: WithResult<SA, SI, FA, FI, R>): Schema.Schema<SA, SI, R> =>
  self[symbolResult].success

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
  Schema.ExitEncoded<SI, FI, unknown>,
  R
> => {
  const proto = Object.getPrototypeOf(self)
  if (!(symbolResult in proto)) {
    return Schema.Exit({
      failure: failureSchema(self),
      success: successSchema(self),
      defect: Schema.Defect
    })
  }
  let schema = exitSchemaCache.get(proto)
  if (schema === undefined) {
    schema = Schema.Exit({
      failure: failureSchema(self),
      success: successSchema(self),
      defect: Schema.Defect
    })
    exitSchemaCache.set(proto, schema)
  }
  return schema
}

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
    Schema.encode(self[symbolResult].failure)(value)
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
  ): Effect.Effect<FA, ParseResult.ParseError, R> => Schema.decodeUnknown(self[symbolResult].failure)(value)
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
    Schema.encode(self[symbolResult].success)(value)
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
  ): Effect.Effect<SA, ParseResult.ParseError, R> => Schema.decodeUnknown(self[symbolResult].success)(value)
)

/**
 * @since 0.67.0
 * @category encoding
 */
export const serializeExit: {
  <SA, FA>(value: Exit.Exit<SA, FA>): <SI, FI, R>(
    self: WithResult<SA, SI, FA, FI, R>
  ) => Effect.Effect<Schema.ExitEncoded<SI, FI, unknown>, ParseResult.ParseError, R>
  <SA, SI, FA, FI, R>(
    self: WithResult<SA, SI, FA, FI, R>,
    value: Exit.Exit<SA, FA>
  ): Effect.Effect<Schema.ExitEncoded<SI, FI, unknown>, ParseResult.ParseError, R>
} = dual(2, <SA, SI, FA, FI, R>(
  self: WithResult<SA, SI, FA, FI, R>,
  value: Exit.Exit<SA, FA>
): Effect.Effect<Schema.ExitEncoded<SI, FI, unknown>, ParseResult.ParseError, R> =>
  Schema.encode(exitSchema(self))(value))

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

// ---------------------------------------------
// SerializableWithResult
// ---------------------------------------------

/**
 * The `SerializableWithResult` trait is specifically designed to model remote
 * procedures that require serialization of their input and output, managing
 * both successful and failed outcomes.
 *
 * This trait combines functionality from both the `Serializable` and `WithResult`
 * traits to handle data serialization and the bifurcation of operation results
 * into success or failure categories.
 *
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
  ResultR
> extends Serializable<A, I, R>, WithResult<Success, SuccessEncoded, Failure, FailureEncoded, ResultR> {}

/**
 * @since 0.67.0
 * @category model
 */
export declare namespace SerializableWithResult {
  /**
   * @since 0.69.0
   */
  export type Context<P> = P extends
    SerializableWithResult<infer _S, infer _SI, infer SR, infer _A, infer _AI, infer _E, infer _EI, infer RR> ? SR | RR
    : never
  /**
   * @since 0.69.0
   */
  export type Any = SerializableWithResult<any, any, any, any, any, any, any, unknown>
  /**
   * @since 0.69.0
   */
  export type All =
    | Any
    | SerializableWithResult<any, any, any, any, any, never, never, unknown>
}

/**
 * @since 0.69.0
 */
export const asSerializableWithResult = <SWR extends SerializableWithResult.All>(
  procedure: SWR
): SerializableWithResult<
  Serializable.Type<SWR>,
  Serializable.Encoded<SWR>,
  Serializable.Context<SWR>,
  WithResult.Success<SWR>,
  WithResult.SuccessEncoded<SWR>,
  WithResult.Failure<SWR>,
  WithResult.FailureEncoded<SWR>,
  WithResult.Context<SWR>
> => procedure as any
