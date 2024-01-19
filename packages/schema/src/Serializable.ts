/**
 * @since 1.0.0
 *
 * Serializable represents an object that has self-contained Schema(s)
 */
import type * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import { dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Internal from "./internal/serializable.js"
import type * as ParseResult from "./ParseResult.js"
import * as Schema from "./Schema.js"

/**
 * @since 1.0.0
 * @category symbol
 */
export const symbol: unique symbol = Internal.symbol as any

/**
 * @since 1.0.0
 * @category model
 */
export interface Serializable<R, I, A> {
  readonly [symbol]: Schema.Schema<R, I, A>
}

/**
 * @since 1.0.0
 * @category model
 */
export declare namespace Serializable {
  /**
   * @since 1.0.0
   */
  export type Context<T> = T extends Serializable<infer R, infer _I, infer _A> ? R : never
}

/**
 * @since 1.0.0
 * @category accessor
 */
export const selfSchema = <R, I, A>(self: Serializable<R, I, A>): Schema.Schema<R, I, A> => self[symbol]

/**
 * @since 1.0.0
 * @category symbol
 */
export const symbolResult: unique symbol = Internal.symbolResult as any

/**
 * @since 1.0.0
 * @category model
 */
export interface WithResult<R, IE, E, IA, A> {
  readonly [symbolResult]: {
    readonly Failure: Schema.Schema<R, IE, E>
    readonly Success: Schema.Schema<R, IA, A>
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
  export type Context<T> = T extends WithResult<infer R, infer _IE, infer _E, infer _IA, infer _A> ? R : never
}

/**
 * @since 1.0.0
 * @category accessor
 */
export const failureSchema = <R, IE, E, IA, A>(
  self: WithResult<R, IE, E, IA, A>
): Schema.Schema<R, IE, E> => self[symbolResult].Failure

/**
 * @since 1.0.0
 * @category accessor
 */
export const successSchema = <R, IE, E, IA, A>(
  self: WithResult<R, IE, E, IA, A>
): Schema.Schema<R, IA, A> => self[symbolResult].Success

const exitSchemaCache = globalValue(
  "@effect/schema/Serializable/exitSchemaCache",
  () => new WeakMap<object, Schema.Schema<any, any>>()
)

/**
 * @since 1.0.0
 * @category accessor
 */
export const exitSchema = <R, IE, E, IA, A>(
  self: WithResult<R, IE, E, IA, A>
): Schema.Schema<R, Schema.ExitFrom<IE, IA>, Exit.Exit<E, A>> => {
  const proto = Object.getPrototypeOf(self)
  if (!(symbolResult in proto)) {
    return Schema.exit(failureSchema(self), successSchema(self))
  }
  let schema = exitSchemaCache.get(proto)
  if (schema === undefined) {
    schema = Schema.exit(failureSchema(self), successSchema(self))
    exitSchemaCache.set(proto, schema)
  }
  return schema
}

/**
 * @since 1.0.0
 * @category model
 */
export interface SerializableWithResult<R, IS, S, RR, IE, E, IA, A>
  extends Serializable<R, IS, S>, WithResult<RR, IE, E, IA, A>
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
    SerializableWithResult<infer R, infer _IS, infer _S, infer RR, infer _IE, infer _E, infer _IA, infer _A> ? R | RR
    : never
}

/**
 * @since 1.0.0
 * @category encoding
 */
export const serialize = <R, I, A>(
  self: Serializable<R, I, A>
): Effect.Effect<R, ParseResult.ParseError, I> => Schema.encode(self[symbol])(self as A)

/**
 * @since 1.0.0
 * @category decoding
 */
export const deserialize: {
  (
    value: unknown
  ): <R, I, A>(self: Serializable<R, I, A>) => Effect.Effect<R, ParseResult.ParseError, A>
  <R, I, A>(self: Serializable<R, I, A>, value: unknown): Effect.Effect<R, ParseResult.ParseError, A>
} = dual<
  (value: unknown) => <R, I, A>(
    self: Serializable<R, I, A>
  ) => Effect.Effect<R, ParseResult.ParseError, A>,
  <R, I, A>(
    self: Serializable<R, I, A>,
    value: unknown
  ) => Effect.Effect<R, ParseResult.ParseError, A>
>(2, (self, value) => Schema.parse(self[symbol])(value))

/**
 * @since 1.0.0
 * @category encoding
 */
export const serializeFailure: {
  <E>(
    value: E
  ): <R, IE, IA, A>(self: WithResult<R, IE, E, IA, A>) => Effect.Effect<R, ParseResult.ParseError, IE>
  <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>,
    value: E
  ): Effect.Effect<R, ParseResult.ParseError, IE>
} = dual<
  <E>(value: E) => <R, IE, IA, A>(
    self: WithResult<R, IE, E, IA, A>
  ) => Effect.Effect<R, ParseResult.ParseError, IE>,
  <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>,
    value: E
  ) => Effect.Effect<R, ParseResult.ParseError, IE>
>(2, (self, value) => Schema.encode(self[symbolResult].Failure)(value))

/**
 * @since 1.0.0
 * @category decoding
 */
export const deserializeFailure: {
  (value: unknown): <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>
  ) => Effect.Effect<R, ParseResult.ParseError, E>
  <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>,
    value: unknown
  ): Effect.Effect<R, ParseResult.ParseError, E>
} = dual<
  (value: unknown) => <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>
  ) => Effect.Effect<R, ParseResult.ParseError, E>,
  <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>,
    value: unknown
  ) => Effect.Effect<R, ParseResult.ParseError, E>
>(2, (self, value) => Schema.parse(self[symbolResult].Failure)(value))

/**
 * @since 1.0.0
 * @category encoding
 */
export const serializeSuccess: {
  <A>(
    value: A
  ): <R, IE, E, IA>(self: WithResult<R, IE, E, IA, A>) => Effect.Effect<R, ParseResult.ParseError, IA>
  <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>,
    value: A
  ): Effect.Effect<R, ParseResult.ParseError, IA>
} = dual<
  <A>(value: A) => <R, IE, E, IA>(
    self: WithResult<R, IE, E, IA, A>
  ) => Effect.Effect<R, ParseResult.ParseError, IA>,
  <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>,
    value: A
  ) => Effect.Effect<R, ParseResult.ParseError, IA>
>(2, (self, value) => Schema.encode(self[symbolResult].Success)(value))

/**
 * @since 1.0.0
 * @category decoding
 */
export const deserializeSuccess: {
  (
    value: unknown
  ): <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>
  ) => Effect.Effect<R, ParseResult.ParseError, A>
  <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>,
    value: unknown
  ): Effect.Effect<R, ParseResult.ParseError, A>
} = dual<
  (value: unknown) => <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>
  ) => Effect.Effect<R, ParseResult.ParseError, A>,
  <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>,
    value: unknown
  ) => Effect.Effect<R, ParseResult.ParseError, A>
>(2, (self, value) => Schema.parse(self[symbolResult].Success)(value))

/**
 * @since 1.0.0
 * @category encoding
 */
export const serializeExit: {
  <E, A>(
    value: Exit.Exit<E, A>
  ): <R, IE, IA>(
    self: WithResult<R, IE, E, IA, A>
  ) => Effect.Effect<R, ParseResult.ParseError, Schema.ExitFrom<IE, IA>>
  <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>,
    value: Exit.Exit<E, A>
  ): Effect.Effect<R, ParseResult.ParseError, Schema.ExitFrom<IE, IA>>
} = dual<
  <E, A>(value: Exit.Exit<E, A>) => <R, IE, IA>(
    self: WithResult<R, IE, E, IA, A>
  ) => Effect.Effect<R, ParseResult.ParseError, Schema.ExitFrom<IE, IA>>,
  <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>,
    value: Exit.Exit<E, A>
  ) => Effect.Effect<R, ParseResult.ParseError, Schema.ExitFrom<IE, IA>>
>(2, (self, value) => Schema.encode(exitSchema(self))(value))

/**
 * @since 1.0.0
 * @category decoding
 */
export const deserializeExit: {
  (value: unknown): <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>
  ) => Effect.Effect<R, ParseResult.ParseError, Exit.Exit<E, A>>
  <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>,
    value: unknown
  ): Effect.Effect<R, ParseResult.ParseError, Exit.Exit<E, A>>
} = dual<
  (value: unknown) => <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>
  ) => Effect.Effect<R, ParseResult.ParseError, Exit.Exit<E, A>>,
  <R, IE, E, IA, A>(
    self: WithResult<R, IE, E, IA, A>,
    value: unknown
  ) => Effect.Effect<R, ParseResult.ParseError, Exit.Exit<E, A>>
>(2, (self, value) => Schema.parse(exitSchema(self))(value))
