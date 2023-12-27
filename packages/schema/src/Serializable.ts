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
import * as Parser from "./Parser.js"
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
export interface Serializable<I, A> {
  readonly [symbol]: Schema.Schema<I, A>
}

/**
 * @since 1.0.0
 * @category accessor
 */
export const selfSchema = <I, A>(self: Serializable<I, A>): Schema.Schema<I, A> => self[symbol]

/**
 * @since 1.0.0
 * @category symbol
 */
export const symbolResult: unique symbol = Internal.symbolResult as any

/**
 * @since 1.0.0
 * @category model
 */
export interface WithResult<IE, E, IA, A> {
  readonly [symbolResult]: {
    readonly Failure: Schema.Schema<IE, E>
    readonly Success: Schema.Schema<IA, A>
  }
}

/**
 * @since 1.0.0
 * @category accessor
 */
export const failureSchema = <IE, E, IA, A>(
  self: WithResult<IE, E, IA, A>
): Schema.Schema<IE, E> => self[symbolResult].Failure

/**
 * @since 1.0.0
 * @category accessor
 */
export const successSchema = <IE, E, IA, A>(
  self: WithResult<IE, E, IA, A>
): Schema.Schema<IA, A> => self[symbolResult].Success

const exitSchemaCache = globalValue(
  "@effect/schema/Serializable/exitSchemaCache",
  () => new WeakMap<object, Schema.Schema<any, any>>()
)

/**
 * @since 1.0.0
 * @category accessor
 */
export const exitSchema = <IE, E, IA, A>(
  self: WithResult<IE, E, IA, A>
): Schema.Schema<Schema.ExitFrom<IE, IA>, Exit.Exit<E, A>> => {
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
export interface SerializableWithResult<IS, S, IE, E, IA, A>
  extends Serializable<IS, S>, WithResult<IE, E, IA, A>
{}

/**
 * @since 1.0.0
 * @category encoding
 */
export const serialize = <I, A>(
  self: Serializable<I, A>
): Effect.Effect<never, ParseResult.ParseError, I> => Parser.encode(self[symbol])(self as A)

/**
 * @since 1.0.0
 * @category decoding
 */
export const deserialize: {
  (
    value: unknown
  ): <I, A>(self: Serializable<I, A>) => Effect.Effect<never, ParseResult.ParseError, A>
  <I, A>(self: Serializable<I, A>, value: unknown): Effect.Effect<never, ParseResult.ParseError, A>
} = dual<
  (value: unknown) => <I, A>(
    self: Serializable<I, A>
  ) => Effect.Effect<never, ParseResult.ParseError, A>,
  <I, A>(
    self: Serializable<I, A>,
    value: unknown
  ) => Effect.Effect<never, ParseResult.ParseError, A>
>(2, (self, value) => Parser.parse(self[symbol])(value))

/**
 * @since 1.0.0
 * @category encoding
 */
export const serializeFailure: {
  <E>(
    value: E
  ): <IE, IA, A>(self: WithResult<IE, E, IA, A>) => Effect.Effect<never, ParseResult.ParseError, IE>
  <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>,
    value: E
  ): Effect.Effect<never, ParseResult.ParseError, IE>
} = dual<
  <E>(value: E) => <IE, IA, A>(
    self: WithResult<IE, E, IA, A>
  ) => Effect.Effect<never, ParseResult.ParseError, IE>,
  <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>,
    value: E
  ) => Effect.Effect<never, ParseResult.ParseError, IE>
>(2, (self, value) => Parser.encode(self[symbolResult].Failure)(value))

/**
 * @since 1.0.0
 * @category decoding
 */
export const deserializeFailure: {
  (value: unknown): <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>
  ) => Effect.Effect<never, ParseResult.ParseError, E>
  <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>,
    value: unknown
  ): Effect.Effect<never, ParseResult.ParseError, E>
} = dual<
  (value: unknown) => <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>
  ) => Effect.Effect<never, ParseResult.ParseError, E>,
  <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>,
    value: unknown
  ) => Effect.Effect<never, ParseResult.ParseError, E>
>(2, (self, value) => Parser.parse(self[symbolResult].Failure)(value))

/**
 * @since 1.0.0
 * @category encoding
 */
export const serializeSuccess: {
  <A>(
    value: A
  ): <IE, E, IA>(self: WithResult<IE, E, IA, A>) => Effect.Effect<never, ParseResult.ParseError, IA>
  <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>,
    value: A
  ): Effect.Effect<never, ParseResult.ParseError, IA>
} = dual<
  <A>(value: A) => <IE, E, IA>(
    self: WithResult<IE, E, IA, A>
  ) => Effect.Effect<never, ParseResult.ParseError, IA>,
  <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>,
    value: A
  ) => Effect.Effect<never, ParseResult.ParseError, IA>
>(2, (self, value) => Parser.encode(self[symbolResult].Success)(value))

/**
 * @since 1.0.0
 * @category decoding
 */
export const deserializeSuccess: {
  (
    value: unknown
  ): <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>
  ) => Effect.Effect<never, ParseResult.ParseError, A>
  <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>,
    value: unknown
  ): Effect.Effect<never, ParseResult.ParseError, A>
} = dual<
  (value: unknown) => <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>
  ) => Effect.Effect<never, ParseResult.ParseError, A>,
  <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>,
    value: unknown
  ) => Effect.Effect<never, ParseResult.ParseError, A>
>(2, (self, value) => Parser.parse(self[symbolResult].Success)(value))

/**
 * @since 1.0.0
 * @category encoding
 */
export const serializeExit: {
  <E, A>(
    value: Exit.Exit<E, A>
  ): <IE, IA>(
    self: WithResult<IE, E, IA, A>
  ) => Effect.Effect<never, ParseResult.ParseError, Schema.ExitFrom<IE, IA>>
  <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>,
    value: Exit.Exit<E, A>
  ): Effect.Effect<never, ParseResult.ParseError, Schema.ExitFrom<IE, IA>>
} = dual<
  <E, A>(value: Exit.Exit<E, A>) => <IE, IA>(
    self: WithResult<IE, E, IA, A>
  ) => Effect.Effect<never, ParseResult.ParseError, Schema.ExitFrom<IE, IA>>,
  <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>,
    value: Exit.Exit<E, A>
  ) => Effect.Effect<never, ParseResult.ParseError, Schema.ExitFrom<IE, IA>>
>(2, (self, value) => Parser.encode(exitSchema(self))(value))

/**
 * @since 1.0.0
 * @category decoding
 */
export const deserializeExit: {
  (value: unknown): <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>
  ) => Effect.Effect<never, ParseResult.ParseError, Exit.Exit<E, A>>
  <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>,
    value: unknown
  ): Effect.Effect<never, ParseResult.ParseError, Exit.Exit<E, A>>
} = dual<
  (value: unknown) => <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>
  ) => Effect.Effect<never, ParseResult.ParseError, Exit.Exit<E, A>>,
  <IE, E, IA, A>(
    self: WithResult<IE, E, IA, A>,
    value: unknown
  ) => Effect.Effect<never, ParseResult.ParseError, Exit.Exit<E, A>>
>(2, (self, value) => Parser.parse(exitSchema(self))(value))
