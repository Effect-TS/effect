/**
 * @since 1.0.0
 */

import * as E from "@effect/data/Either"
import * as O from "@effect/data/Option"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"
import * as Debug from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type * as AST from "@effect/schema/AST"

/**
 * @since 1.0.0
 */
export type IO<E, A> = Effect.Effect<never, E, A> | E.Either<E, A>

/**
 * @since 1.0.0
 */
export type ParseResult<A> = IO<ParseError, A>

/**
 * @since 1.0.0
 */
export interface ParseError {
  readonly _tag: "ParseError"
  readonly errors: NonEmptyReadonlyArray<ParseErrors>
}

/**
 * @since 1.0.0
 */
export const parseError = (errors: NonEmptyReadonlyArray<ParseErrors>): ParseError => ({
  _tag: "ParseError",
  errors
})

/**
 * `ParseErrors` is a type that represents the different types of errors that can occur when decoding a value.
 *
 * @category model
 * @since 1.0.0
 */
export type ParseErrors =
  | Type
  | Index
  | Key
  | Missing
  | Unexpected
  | UnionMember

/**
 * The `Type` variant of the `ParseError` type represents an error that occurs when the `actual` value is not of the expected type.
 * The `expected` field specifies the expected type, and the `actual` field contains the value that caused the error.
 * This error can occur when trying to decode a value using a schema that is only able to decode values of a specific type,
 * and the actual value is not of that type. For example, if you are using a schema to decode a string value and the actual value
 * is a number, a `Type` decode error would be returned.
 *
 * @category model
 * @since 1.0.0
 */
export interface Type {
  readonly _tag: "Type"
  readonly expected: AST.AST
  readonly actual: unknown
  readonly message: O.Option<string>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const type = (expected: AST.AST, actual: unknown, message?: string): Type => ({
  _tag: "Type",
  expected,
  actual,
  message: O.fromNullable(message)
})

/**
 * The `Index` decode error indicates that there was an error at a specific index in an array or tuple.
 * The `errors` field contains the decode errors for that index. This error is typically used when decoding an array or tuple
 * with a schema that has constraints on the elements. For example, you might use an `Index` decode error to indicate
 * that a specific element in an array did not match the expected type or value.
 *
 * @category model
 * @since 1.0.0
 */
export interface Index {
  readonly _tag: "Index"
  readonly index: number
  readonly errors: NonEmptyReadonlyArray<ParseErrors>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const index = (
  index: number,
  errors: NonEmptyReadonlyArray<ParseErrors>
): Index => ({
  _tag: "Index",
  index,
  errors
})

/**
 * The `Key` variant of the `ParseError` type represents an error that occurs when a key in an object is invalid.
 * This error typically occurs when the `actual` value is not a valid key type (e.g. a string or number)
 * or when the key is not present in the object being decoded. In either case, the `key` field of the error will contain
 * the invalid key value. This error is typically used in combination with the `Unexpected` error,
 * which indicates that an unexpected key was found in the object being decoded.
 *
 * @category model
 * @since 1.0.0
 */
export interface Key {
  readonly _tag: "Key"
  readonly key: PropertyKey
  readonly errors: NonEmptyReadonlyArray<ParseErrors>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const key = (
  key: PropertyKey,
  errors: NonEmptyReadonlyArray<ParseErrors>
): Key => ({
  _tag: "Key",
  key,
  errors
})

/**
 * Error that occurs when a required key or index is missing.
 *
 * @category model
 * @since 1.0.0
 */
export interface Missing {
  readonly _tag: "Missing"
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const missing: Missing = { _tag: "Missing" }

/**
 * Error that occurs when an unexpected key or index is present.
 *
 * @category model
 * @since 1.0.0
 */
export interface Unexpected {
  readonly _tag: "Unexpected"
  readonly actual: unknown
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const unexpected = (
  actual: unknown
): Unexpected => ({
  _tag: "Unexpected",
  actual
})

/**
 * Error that occurs when a member in a union has an error.
 *
 * @category model
 * @since 1.0.0
 */
export interface UnionMember {
  readonly _tag: "UnionMember"
  readonly errors: NonEmptyReadonlyArray<ParseErrors>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const unionMember = (
  errors: NonEmptyReadonlyArray<ParseErrors>
): UnionMember => ({
  _tag: "UnionMember",
  errors
})

/**
 * @category constructors
 * @since 1.0.0
 */
export const success: <A>(a: A) => ParseResult<A> = E.right

/**
 * @category constructors
 * @since 1.0.0
 */
export const failure = (e: ParseErrors): ParseResult<never> => E.left(parseError([e]))

/**
 * @category constructors
 * @since 1.0.0
 */
export const failures = (
  es: NonEmptyReadonlyArray<ParseErrors>
): ParseResult<never> => E.left(parseError(es))

/**
 * @category optimisation
 * @since 1.0.0
 */
export const eitherOrUndefined = <E, A>(self: IO<E, A>): E.Either<E, A> | undefined => {
  // @ts-expect-error
  if (self["_tag"] === "Left" || self["_tag"] === "Right") {
    // @ts-expect-error
    return self
  }
}

/**
 * @category optimisation
 * @since 1.0.0
 */
export const eitherOrRunSyncEither = <E, A>(self: IO<E, A>): E.Either<E, A> => {
  // @ts-expect-error
  if (self["_tag"] === "Left" || self["_tag"] === "Right") {
    // @ts-expect-error
    return self
  }
  // @ts-expect-error
  return Debug.untraced(() => Effect.runSyncEither(self))
}

/**
 * @category optimisation
 * @since 1.0.0
 */
export const effect: <E, A>(self: IO<E, A>) => Effect.Effect<never, E, A> = (self) => {
  if (Effect.isEffect(self)) {
    return self
  }
  return Effect.fromEither(self)
}

/**
 * @category optimisation
 * @since 1.0.0
 */
export const flatMap = <E, E1, A, B>(
  self: IO<E, A>,
  f: (self: A) => IO<E1, B>
): IO<E | E1, B> => {
  // @ts-expect-error
  if (self["_tag"] === "Left") {
    // @ts-expect-error
    return self
  }
  // @ts-expect-error
  if (self["_tag"] === "Right") {
    // @ts-expect-error
    return f(self.right)
  }
  // @ts-expect-error
  return Debug.bodyWithTrace((trace, restore) =>
    // @ts-expect-error
    Effect.flatMap(self, (a) => effect(restore(f)(a))).traced(trace)
  )
}

/**
 * @category optimisation
 * @since 1.0.0
 */
export const map = <E, A, B>(
  self: IO<E, A>,
  f: (self: A) => B
): IO<E, B> => {
  // @ts-expect-error
  if (self["_tag"] === "Left") {
    // @ts-expect-error
    return self
  }
  // @ts-expect-error
  if (self["_tag"] === "Right") {
    // @ts-expect-error
    return E.right(f(self.right))
  }
  // @ts-expect-error
  return Debug.bodyWithTrace((trace, restore) => Effect.map(self, restore(f)).traced(trace))
}
