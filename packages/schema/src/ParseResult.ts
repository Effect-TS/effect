/**
 * @since 1.0.0
 */

import type { Either, Left, Right } from "@effect/data/Either"
import * as E from "@effect/data/Either"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"
import type * as AST from "@fp-ts/schema/AST"

/**
 * @since 1.0.0
 */
export type ParseResult<A> = Either<NonEmptyReadonlyArray<ParseError>, A>

/**
 * `ParseError` is a type that represents the different types of errors that can occur when decoding a value.
 *
 * @category model
 * @since 1.0.0
 */
export type ParseError =
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
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const type = (expected: AST.AST, actual: unknown): Type => ({
  _tag: "Type",
  expected,
  actual
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
  readonly errors: NonEmptyReadonlyArray<ParseError>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const index = (
  index: number,
  errors: NonEmptyReadonlyArray<ParseError>
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
  readonly errors: NonEmptyReadonlyArray<ParseError>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const key = (
  key: PropertyKey,
  errors: NonEmptyReadonlyArray<ParseError>
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
  readonly errors: NonEmptyReadonlyArray<ParseError>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const unionMember = (
  errors: NonEmptyReadonlyArray<ParseError>
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
export const failure = (e: ParseError): ParseResult<never> => E.left([e])

/**
 * @category constructors
 * @since 1.0.0
 */
export const failures = (
  es: NonEmptyReadonlyArray<ParseError>
): ParseResult<never> => E.left(es)

/**
 * @category guards
 * @since 1.0.0
 */
export const isSuccess: <A>(self: ParseResult<A>) => self is Right<A> = E.isRight

/**
 * @category guards
 * @since 1.0.0
 */
export const isFailure: <A>(
  self: ParseResult<A>
) => self is Left<NonEmptyReadonlyArray<ParseError>> = E.isLeft
