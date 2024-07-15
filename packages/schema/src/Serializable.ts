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
// WithExit
// ---------------------------------------------

/**
 * @since 0.67.0
 * @category symbol
 */
export const symbolExit: unique symbol = serializable_.symbolExit as any

/**
 * The `WithExit` trait is designed to encapsulate the outcome of an
 * operation, distinguishing between success and failure cases. Each case is
 * associated with a schema that defines the structure and types of the success
 * or failure data.
 *
 * @since 0.67.0
 * @category model
 */
export interface WithExit<Success, SuccessEncoded, Failure, FailureEncoded, ExitR> {
  readonly [symbolExit]: {
    readonly success: Schema.Schema<Success, SuccessEncoded, ExitR>
    readonly failure: Schema.Schema<Failure, FailureEncoded, ExitR>
    readonly defect: Schema.Schema<unknown, unknown, ExitR>
  }
}

/**
 * @since 0.67.0
 * @category model
 */
export declare namespace WithExit {
  /**
   * @since 0.68.16
   */
  export type Success<T> = T extends WithExit<infer _A, infer _I, infer _E, infer _EI, infer _R> ? _A : never
  /**
   * @since 0.69.0
   */
  export type SuccessEncoded<T> = T extends WithExit<infer _A, infer _I, infer _E, infer _EI, infer _R> ? _I : never
  /**
   * @since 0.69.0
   */
  export type Failure<T> = T extends WithExit<infer _A, infer _I, infer _E, infer _EI, infer _R> ? _E : never
  /**
   * @since 0.69.0
   */
  export type FailureEncoded<T> = T extends WithExit<infer _A, infer _I, infer _E, infer _EI, infer _R> ? _EI : never

  /**
   * @since 0.67.0
   */
  export type Context<T> = T extends WithExit<infer _SA, infer _SI, infer _FA, infer _FI, infer R> ? R : never
  /**
   * @since 0.69.0
   */
  export type Any = WithExit<any, any, any, any, unknown>
  /**
   * @since 0.69.0
   */
  export type All =
    | Any
    | WithExit<any, any, never, never, unknown>
}

/**
 * @since 0.69.0
 */
export const asWithExit = <WE extends WithExit.All>(
  withExit: WE
): WithExit<
  WithExit.Success<WE>,
  WithExit.SuccessEncoded<WE>,
  WithExit.Failure<WE>,
  WithExit.FailureEncoded<WE>,
  WithExit.Context<WE>
> => withExit as any

/**
 * @since 0.67.0
 * @category accessor
 */
export const failureSchema = <SA, SI, FA, FI, R>(self: WithExit<SA, SI, FA, FI, R>): Schema.Schema<FA, FI, R> =>
  self[symbolExit].failure

/**
 * @since 0.67.0
 * @category accessor
 */
export const successSchema = <SA, SI, FA, FI, R>(self: WithExit<SA, SI, FA, FI, R>): Schema.Schema<SA, SI, R> =>
  self[symbolExit].success

/**
 * @since 0.69.0
 * @category accessor
 */
export const defectSchema = <SA, SI, FA, FI, R>(
  self: WithExit<SA, SI, FA, FI, R>
): Schema.Schema<unknown, unknown, R> => self[symbolExit].defect

const exitSchemaCache = globalValue(
  "@effect/schema/Serializable/exitSchemaCache",
  () => new WeakMap<object, Schema.Schema<any, any, any>>()
)

/**
 * @since 0.67.0
 * @category accessor
 */
export const exitSchema = <SA, SI, FA, FI, R>(self: WithExit<SA, SI, FA, FI, R>): Schema.Schema<
  Exit.Exit<SA, FA>,
  Schema.ExitEncoded<SI, FI>,
  R
> => {
  const proto = Object.getPrototypeOf(self)
  if (!(symbolExit in proto)) {
    return Schema.Exit({
      failure: failureSchema(self),
      success: successSchema(self),
      defect: defectSchema(self)
    })
  }
  let schema = exitSchemaCache.get(proto)
  if (schema === undefined) {
    schema = Schema.Exit({
      failure: failureSchema(self),
      success: successSchema(self),
      defect: defectSchema(self)
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
    self: WithExit<SA, SI, FA, FI, R>
  ) => Effect.Effect<FI, ParseResult.ParseError, R>
  <SA, SI, FA, FI, R>(self: WithExit<SA, SI, FA, FI, R>, value: FA): Effect.Effect<FI, ParseResult.ParseError, R>
} = dual(
  2,
  <SA, SI, FA, FI, R>(self: WithExit<SA, SI, FA, FI, R>, value: FA): Effect.Effect<FI, ParseResult.ParseError, R> =>
    Schema.encode(self[symbolExit].failure)(value)
)

/**
 * @since 0.67.0
 * @category decoding
 */
export const deserializeFailure: {
  (
    value: unknown
  ): <SA, SI, FA, FI, R>(self: WithExit<SA, SI, FA, FI, R>) => Effect.Effect<FA, ParseResult.ParseError, R>
  <SA, SI, FA, FI, R>(self: WithExit<SA, SI, FA, FI, R>, value: unknown): Effect.Effect<FA, ParseResult.ParseError, R>
} = dual(
  2,
  <SA, SI, FA, FI, R>(
    self: WithExit<SA, SI, FA, FI, R>,
    value: unknown
  ): Effect.Effect<FA, ParseResult.ParseError, R> => Schema.decodeUnknown(self[symbolExit].failure)(value)
)

/**
 * @since 0.67.0
 * @category encoding
 */
export const serializeSuccess: {
  <SA>(value: SA): <SI, FA, FI, R>(
    self: WithExit<SA, SI, FA, FI, R>
  ) => Effect.Effect<SI, ParseResult.ParseError, R>
  <SA, SI, FA, FI, R>(self: WithExit<SA, SI, FA, FI, R>, value: SA): Effect.Effect<SI, ParseResult.ParseError, R>
} = dual(
  2,
  <SA, SI, FA, FI, R>(self: WithExit<SA, SI, FA, FI, R>, value: SA): Effect.Effect<SI, ParseResult.ParseError, R> =>
    Schema.encode(self[symbolExit].success)(value)
)

/**
 * @since 0.67.0
 * @category decoding
 */
export const deserializeSuccess: {
  (value: unknown): <SA, SI, FA, FI, R>(
    self: WithExit<SA, SI, FA, FI, R>
  ) => Effect.Effect<SA, ParseResult.ParseError, R>
  <SA, SI, FA, FI, R>(self: WithExit<SA, SI, FA, FI, R>, value: unknown): Effect.Effect<SA, ParseResult.ParseError, R>
} = dual(
  2,
  <SA, SI, FA, FI, R>(
    self: WithExit<SA, SI, FA, FI, R>,
    value: unknown
  ): Effect.Effect<SA, ParseResult.ParseError, R> => Schema.decodeUnknown(self[symbolExit].success)(value)
)

/**
 * @since 0.67.0
 * @category encoding
 */
export const serializeExit: {
  <SA, FA>(value: Exit.Exit<SA, FA>): <SI, FI, R>(
    self: WithExit<SA, SI, FA, FI, R>
  ) => Effect.Effect<Schema.ExitEncoded<SI, FI>, ParseResult.ParseError, R>
  <SA, SI, FA, FI, R>(
    self: WithExit<SA, SI, FA, FI, R>,
    value: Exit.Exit<SA, FA>
  ): Effect.Effect<Schema.ExitEncoded<SI, FI>, ParseResult.ParseError, R>
} = dual(2, <SA, SI, FA, FI, R>(
  self: WithExit<SA, SI, FA, FI, R>,
  value: Exit.Exit<SA, FA>
): Effect.Effect<Schema.ExitEncoded<SI, FI>, ParseResult.ParseError, R> => Schema.encode(exitSchema(self))(value))

/**
 * @since 0.67.0
 * @category decoding
 */
export const deserializeExit: {
  (value: unknown): <SA, SI, FA, FI, R>(
    self: WithExit<SA, SI, FA, FI, R>
  ) => Effect.Effect<Exit.Exit<SA, FA>, ParseResult.ParseError, R>
  <SA, SI, FA, FI, R>(
    self: WithExit<SA, SI, FA, FI, R>,
    value: unknown
  ): Effect.Effect<Exit.Exit<SA, FA>, ParseResult.ParseError, R>
} = dual(2, <SA, SI, FA, FI, R>(
  self: WithExit<SA, SI, FA, FI, R>,
  value: unknown
): Effect.Effect<Exit.Exit<SA, FA>, ParseResult.ParseError, R> => Schema.decodeUnknown(exitSchema(self))(value))

// ---------------------------------------------
// SerializableWithExit
// ---------------------------------------------

/**
 * The primary aim of this trait is to model the following remote procedure:
 *
 * ```ts
 * (a: A): Exit<Success, Failure>
 * ```
 *
 * Transmission Diagram:
 *
 * A -> I --- over the wire ---> I -> A:
 *    -> Success -> SuccessEncoded --- over the wire ---> SuccessEncoded -> Success
 *    -> Failure -> FailureEncoded --- over the wire ---> FailureEncoded -> Failure
 *
 * @since 0.69.0
 * @category model
 */
export interface SerializableWithExit<
  A,
  I,
  R,
  Success,
  SuccessEncoded,
  Failure,
  FailureEncoded,
  ExitR
> extends Serializable<A, I, R>, WithExit<Success, SuccessEncoded, Failure, FailureEncoded, ExitR> {}

/**
 * @since 0.69.0
 * @category model
 */
export declare namespace SerializableWithExit {
  /**
   * @since 0.69.0
   */
  export type Context<P> = P extends
    SerializableWithExit<infer _S, infer _SI, infer SR, infer _A, infer _AI, infer _E, infer _EI, infer RR> ? SR | RR
    : never
  /**
   * @since 0.69.0
   */
  export type Any = SerializableWithExit<any, any, any, any, any, any, any, unknown>
  /**
   * @since 0.69.0
   */
  export type All =
    | Any
    | SerializableWithExit<any, any, any, any, any, never, never, unknown>
}

/**
 * @since 0.69.0
 */
export const asSerializableWithExit = <P extends SerializableWithExit.All>(
  procedure: P
): SerializableWithExit<
  Serializable.Type<P>,
  Serializable.Encoded<P>,
  Serializable.Context<P>,
  WithExit.Success<P>,
  WithExit.SuccessEncoded<P>,
  WithExit.Failure<P>,
  WithExit.FailureEncoded<P>,
  WithExit.Context<P>
> => procedure as any
