/**
 * @since 1.0.0
 *
 * Serializable represents an object that has self-contained Schema(s)
 */
import type * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import { dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as serializable_ from "./internal/serializable.js"
import type * as ParseResult from "./ParseResult.js"
import * as Schema from "./Schema.js"

/**
 * @since 1.0.0
 * @category symbol
 */
export const symbol: unique symbol = serializable_.symbol as any

/**
 * @since 1.0.0
 * @category model
 */
export interface Serializable<A, I, R> {
  readonly [symbol]: Schema.Schema<A, I, R>
}

/**
 * @since 1.0.0
 * @category model
 */
export declare namespace Serializable {
  /**
   * @since 1.0.0
   */
  export type Context<T> = T extends Serializable<infer _A, infer _I, infer R> ? R : never
}

/**
 * @since 1.0.0
 * @category accessor
 */
export const selfSchema = <A, I, R>(self: Serializable<A, I, R>): Schema.Schema<A, I, R> => self[symbol]

/**
 * @since 1.0.0
 * @category symbol
 */
export const symbolResult: unique symbol = serializable_.symbolResult as any

/**
 * @since 1.0.0
 * @category model
 */
export interface WithResult<A, I, E, EI, R> {
  readonly [symbolResult]: {
    readonly Success: Schema.Schema<A, I, R>
    readonly Failure: Schema.Schema<E, EI, R>
  }
}

/**
 * @since 1.0.0
 * @category model
 */
export declare namespace WithResult {
  /**
   * @since 1.0.0
   */
  export type Context<T> = T extends WithResult<infer _A, infer _I, infer _E, infer _EI, infer R> ? R : never
}

/**
 * @since 1.0.0
 * @category accessor
 */
export const failureSchema = <A, I, E, EI, R>(
  self: WithResult<A, I, E, EI, R>
): Schema.Schema<E, EI, R> => self[symbolResult].Failure

/**
 * @since 1.0.0
 * @category accessor
 */
export const successSchema = <A, I, E, EI, R>(
  self: WithResult<A, I, E, EI, R>
): Schema.Schema<A, I, R> => self[symbolResult].Success

const exitSchemaCache = globalValue(
  "@effect/schema/Serializable/exitSchemaCache",
  () => new WeakMap<object, Schema.Schema<any, any, any>>()
)

/**
 * @since 1.0.0
 * @category accessor
 */
export const exitSchema = <A, I, E, EI, R>(
  self: WithResult<A, I, E, EI, R>
): Schema.Schema<Exit.Exit<A, E>, Schema.ExitEncoded<I, EI>, R> => {
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
 * @since 1.0.0
 * @category model
 */
export interface SerializableWithResult<S, SI, SR, A, AI, E, EI, RR>
  extends Serializable<S, SI, SR>, WithResult<A, AI, E, EI, RR>
{}

/**
 * @since 1.0.0
 * @category model
 */
export declare namespace SerializableWithResult {
  /**
   * @since 1.0.0
   */
  export type Context<T> = T extends
    SerializableWithResult<infer _S, infer _SI, infer SR, infer _A, infer _AI, infer _E, infer _EI, infer RR> ? SR | RR
    : never
}

/**
 * @since 1.0.0
 * @category encoding
 */
export const serialize = <A, I, R>(
  self: Serializable<A, I, R>
): Effect.Effect<I, ParseResult.ParseError, R> => Schema.encode(self[symbol])(self as A)

/**
 * @since 1.0.0
 * @category decoding
 */
export const deserialize: {
  (
    value: unknown
  ): <A, I, R>(self: Serializable<A, I, R>) => Effect.Effect<A, ParseResult.ParseError, R>
  <A, I, R>(self: Serializable<A, I, R>, value: unknown): Effect.Effect<A, ParseResult.ParseError, R>
} = dual<
  (value: unknown) => <A, I, R>(
    self: Serializable<A, I, R>
  ) => Effect.Effect<A, ParseResult.ParseError, R>,
  <A, I, R>(
    self: Serializable<A, I, R>,
    value: unknown
  ) => Effect.Effect<A, ParseResult.ParseError, R>
>(2, (self, value) => Schema.decodeUnknown(self[symbol])(value))

/**
 * @since 1.0.0
 * @category encoding
 */
export const serializeFailure: {
  <E>(
    value: E
  ): <A, I, EI, R>(self: WithResult<A, I, E, EI, R>) => Effect.Effect<EI, ParseResult.ParseError, R>
  <A, I, E, EI, R>(
    self: WithResult<A, I, E, EI, R>,
    value: E
  ): Effect.Effect<EI, ParseResult.ParseError, R>
} = dual<
  <E>(value: E) => <A, I, EI, R>(
    self: WithResult<A, I, E, EI, R>
  ) => Effect.Effect<EI, ParseResult.ParseError, R>,
  <A, I, E, EI, R>(
    self: WithResult<A, I, E, EI, R>,
    value: E
  ) => Effect.Effect<EI, ParseResult.ParseError, R>
>(2, (self, value) => Schema.encode(self[symbolResult].Failure)(value))

/**
 * @since 1.0.0
 * @category decoding
 */
export const deserializeFailure: {
  (value: unknown): <A, I, E, EI, R>(
    self: WithResult<A, I, E, EI, R>
  ) => Effect.Effect<E, ParseResult.ParseError, R>
  <A, I, E, EI, R>(
    self: WithResult<A, I, E, EI, R>,
    value: unknown
  ): Effect.Effect<E, ParseResult.ParseError, R>
} = dual<
  (value: unknown) => <A, I, E, EI, R>(
    self: WithResult<A, I, E, EI, R>
  ) => Effect.Effect<E, ParseResult.ParseError, R>,
  <A, I, E, EI, R>(
    self: WithResult<A, I, E, EI, R>,
    value: unknown
  ) => Effect.Effect<E, ParseResult.ParseError, R>
>(2, (self, value) => Schema.decodeUnknown(self[symbolResult].Failure)(value))

/**
 * @since 1.0.0
 * @category encoding
 */
export const serializeSuccess: {
  <A>(
    value: A
  ): <I, E, EI, R>(self: WithResult<A, I, E, EI, R>) => Effect.Effect<I, ParseResult.ParseError, R>
  <A, I, E, EI, R>(
    self: WithResult<A, I, E, EI, R>,
    value: A
  ): Effect.Effect<I, ParseResult.ParseError, R>
} = dual<
  <A>(value: A) => <I, E, EI, R>(
    self: WithResult<A, I, E, EI, R>
  ) => Effect.Effect<I, ParseResult.ParseError, R>,
  <A, I, E, EI, R>(
    self: WithResult<A, I, E, EI, R>,
    value: A
  ) => Effect.Effect<I, ParseResult.ParseError, R>
>(2, (self, value) => Schema.encode(self[symbolResult].Success)(value))

/**
 * @since 1.0.0
 * @category decoding
 */
export const deserializeSuccess: {
  (
    value: unknown
  ): <A, I, E, EI, R>(
    self: WithResult<A, I, E, EI, R>
  ) => Effect.Effect<A, ParseResult.ParseError, R>
  <A, I, E, EI, R>(
    self: WithResult<A, I, E, EI, R>,
    value: unknown
  ): Effect.Effect<A, ParseResult.ParseError, R>
} = dual<
  (value: unknown) => <A, I, E, EI, R>(
    self: WithResult<A, I, E, EI, R>
  ) => Effect.Effect<A, ParseResult.ParseError, R>,
  <A, I, E, EI, R>(
    self: WithResult<A, I, E, EI, R>,
    value: unknown
  ) => Effect.Effect<A, ParseResult.ParseError, R>
>(2, (self, value) => Schema.decodeUnknown(self[symbolResult].Success)(value))

/**
 * @since 1.0.0
 * @category encoding
 */
export const serializeExit: {
  <A, E>(
    value: Exit.Exit<A, E>
  ): <I, EI, R>(
    self: WithResult<A, I, E, EI, R>
  ) => Effect.Effect<Schema.ExitEncoded<I, EI>, ParseResult.ParseError, R>
  <A, I, E, EI, R>(
    self: WithResult<A, I, E, EI, R>,
    value: Exit.Exit<A, E>
  ): Effect.Effect<Schema.ExitEncoded<I, EI>, ParseResult.ParseError, R>
} = dual(2, <A, I, E, EI, R>(
  self: WithResult<A, I, E, EI, R>,
  value: Exit.Exit<A, E>
): Effect.Effect<Schema.ExitEncoded<I, EI>, ParseResult.ParseError, R> => Schema.encode(exitSchema(self))(value))

/**
 * @since 1.0.0
 * @category decoding
 */
export const deserializeExit: {
  (value: unknown): <A, I, E, EI, R>(
    self: WithResult<A, I, E, EI, R>
  ) => Effect.Effect<Exit.Exit<A, E>, ParseResult.ParseError, R>
  <A, I, E, EI, R>(
    self: WithResult<A, I, E, EI, R>,
    value: unknown
  ): Effect.Effect<Exit.Exit<A, E>, ParseResult.ParseError, R>
} = dual(2, <A, I, E, EI, R>(
  self: WithResult<A, I, E, EI, R>,
  value: unknown
): Effect.Effect<Exit.Exit<A, E>, ParseResult.ParseError, R> => Schema.decodeUnknown(exitSchema(self))(value))
