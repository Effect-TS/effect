/**
 * @since 1.0.0
 */

import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import type { LazyArg } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
import * as Option from "effect/Option"
import type * as ReadonlyArray from "effect/ReadonlyArray"
import type * as AST from "./AST.js"
import * as TreeFormatter from "./TreeFormatter.js"

/**
 * @since 1.0.0
 */
export interface ParseResult<A> extends Effect.Effect<never, ParseError, A> {}

/**
 * @since 1.0.0
 */
export interface ParseError {
  readonly _tag: "ParseError"
  readonly errors: ReadonlyArray.NonEmptyReadonlyArray<ParseIssue>
}

class ParseErrorImpl implements Inspectable.Inspectable {
  readonly _tag = "ParseError"
  constructor(readonly errors: ReadonlyArray.NonEmptyReadonlyArray<ParseIssue>) {}
  toString() {
    return TreeFormatter.formatErrors(this.errors)
  }
  toJSON() {
    return {
      _id: "ParseError",
      message: this.toString()
    }
  }
  [Inspectable.NodeInspectSymbol]() {
    return this.toJSON()
  }
}

/**
 * @since 1.0.0
 */
export const parseError = (
  errors: ReadonlyArray.NonEmptyReadonlyArray<ParseIssue>
): ParseError => new ParseErrorImpl(errors)

/**
 * `ParseErrors` is a type that represents the different types of errors that can occur when decoding a value.
 *
 * @category model
 * @since 1.0.0
 */
export type ParseIssue =
  // context
  | Refinement
  | Tuple
  | TypeLiteral
  | Union
  | Key
  | Transform
  // primitives
  | Type
  | Missing
  | Unexpected
  | Forbidden

/**
 * Error that occurs when a transformation has an error.
 *
 * @category model
 * @since 1.0.0
 */
export interface Transform {
  readonly _tag: "Transform"
  readonly ast: AST.Transform
  readonly actual: unknown
  readonly kind: "From" | "Transformation" | "To"
  readonly errors: ReadonlyArray.NonEmptyReadonlyArray<ParseIssue>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const transform = (
  ast: AST.Transform,
  actual: unknown,
  kind: "From" | "Transformation" | "To",
  errors: ReadonlyArray.NonEmptyReadonlyArray<ParseIssue>
): Transform => ({ _tag: "Transform", ast, actual, kind, errors })

/**
 * The `Type` variant of the `ParseIssue` type represents an error that occurs when the `actual` value is not of the expected type.
 * The `ast` field specifies the expected type, and the `actual` field contains the value that caused the error.
 * This error can occur when trying to decode a value using a schema that is only able to decode values of a specific type,
 * and the actual value is not of that type. For example, if you are using a schema to decode a string value and the actual value
 * is a number, a `Type` decode error would be returned.
 *
 * @category model
 * @since 1.0.0
 */
export interface Type {
  readonly _tag: "Type"
  readonly ast: AST.AST
  readonly actual: unknown
  readonly message: Option.Option<string>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const type = (ast: AST.AST, actual: unknown, message?: string): Type => ({
  _tag: "Type",
  ast,
  actual,
  message: Option.fromNullable(message)
})

/**
 * The `Forbidden` variant of the `ParseIssue` type represents an error that occurs when an Effect is encounter but disallowed from execution.
 *
 * @category model
 * @since 1.0.0
 */
export interface Forbidden {
  readonly _tag: "Forbidden"
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const forbidden: Forbidden = {
  _tag: "Forbidden"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Refinement {
  readonly _tag: "Refinement"
  readonly ast: AST.Refinement
  readonly actual: unknown
  readonly kind: "From" | "Predicate"
  readonly errors: ReadonlyArray.NonEmptyReadonlyArray<ParseIssue>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const refinement = (
  ast: AST.Refinement,
  actual: unknown,
  kind: "From" | "Predicate",
  errors: ReadonlyArray.NonEmptyReadonlyArray<ParseIssue>
): Refinement => ({ _tag: "Refinement", ast, actual, kind, errors })

/**
 * @category model
 * @since 1.0.0
 */
export interface Tuple {
  readonly _tag: "Tuple"
  readonly ast: AST.Tuple
  readonly actual: unknown
  readonly errors: ReadonlyArray.NonEmptyReadonlyArray<Index>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const tuple = (
  ast: AST.Tuple,
  actual: unknown,
  errors: ReadonlyArray.NonEmptyReadonlyArray<Index>
): Tuple => ({ _tag: "Tuple", ast, actual, errors })

/**
 * @category model
 * @since 1.0.0
 */
export interface TypeLiteral {
  readonly _tag: "TypeLiteral"
  readonly ast: AST.TypeLiteral
  readonly actual: unknown
  readonly errors: ReadonlyArray.NonEmptyReadonlyArray<Key>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const typeLiteral = (
  ast: AST.TypeLiteral,
  actual: unknown,
  errors: ReadonlyArray.NonEmptyReadonlyArray<Key>
): TypeLiteral => ({ _tag: "TypeLiteral", ast, actual, errors })

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
  readonly errors: ReadonlyArray.NonEmptyReadonlyArray<ParseIssue>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const index = (
  index: number,
  errors: ReadonlyArray.NonEmptyReadonlyArray<ParseIssue>
): Index => ({ _tag: "Index", index, errors })

/**
 * The `Key` variant of the `ParseIssue` type represents an error that occurs when a key in an object is invalid.
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
  readonly errors: ReadonlyArray.NonEmptyReadonlyArray<ParseIssue>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const key = (
  key: PropertyKey,
  errors: ReadonlyArray.NonEmptyReadonlyArray<ParseIssue>
): Key => ({ _tag: "Key", key, errors })

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
  readonly ast: AST.AST
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const unexpected = (
  ast: AST.AST
): Unexpected => ({ _tag: "Unexpected", ast })

/**
 * Error that occurs when a union has an error.
 *
 * @category model
 * @since 1.0.0
 */
export interface Union {
  readonly _tag: "Union"
  readonly ast: AST.Union
  readonly actual: unknown
  readonly errors: ReadonlyArray.NonEmptyReadonlyArray<Member | Key | Type>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const union = (
  ast: AST.Union,
  actual: unknown,
  errors: ReadonlyArray.NonEmptyReadonlyArray<Member | Key | Type>
): Union => ({ _tag: "Union", ast, actual, errors })

/**
 * Error that occurs when a member in a union has an error.
 *
 * @category model
 * @since 1.0.0
 */
export interface Member {
  readonly _tag: "Member"
  readonly ast: AST.AST
  readonly errors: ReadonlyArray.NonEmptyReadonlyArray<ParseIssue>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const member = (
  ast: AST.AST,
  errors: ReadonlyArray.NonEmptyReadonlyArray<ParseIssue>
): Member => ({ _tag: "Member", ast, errors })

/**
 * @category constructors
 * @since 1.0.0
 */
export const succeed: <A>(a: A) => ParseResult<A> = Either.right

const _try: <A>(options: {
  try: LazyArg<A>
  catch: (e: unknown) => ParseError
}) => ParseResult<A> = Either.try

export {
  /**
   * @category constructors
   * @since 1.0.0
   */
  _try as try
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const fail = (
  error: ParseError | ParseIssue | ReadonlyArray.NonEmptyReadonlyArray<ParseIssue>
): ParseResult<never> => {
  const e = error
  if ("_tag" in e) {
    return e._tag === "ParseError" ? Either.left(e) : Either.left(parseError([e]))
  }
  return Either.left(parseError(e))
}

/**
 * @category optimisation
 * @since 1.0.0
 */
export const eitherOrUndefined = <A>(
  self: ParseResult<A>
): Either.Either<ParseError, A> | undefined => {
  const s: any = self
  if (s["_tag"] === "Left" || s["_tag"] === "Right") {
    return s
  }
}

/**
 * @category optimisation
 * @since 1.0.0
 */
export const flatMap = <A, B>(
  self: ParseResult<A>,
  f: (self: A) => ParseResult<B>
): ParseResult<B> => {
  const s: any = self
  if (s["_tag"] === "Left") {
    return s
  }
  if (s["_tag"] === "Right") {
    return f(s.right)
  }
  return Effect.flatMap(self, f)
}

/**
 * @category optimisation
 * @since 1.0.0
 */
export const map = <A, B>(self: ParseResult<A>, f: (self: A) => B): ParseResult<B> => {
  const s: any = self
  if (s["_tag"] === "Left") {
    return s
  }
  if (s["_tag"] === "Right") {
    return Either.right(f(s.right))
  }
  return Effect.map(self, f)
}

/**
 * @category optimisation
 * @since 1.0.0
 */
export const mapLeft = <A>(
  self: ParseResult<A>,
  f: (error: ParseError) => ParseError
): ParseResult<A> => {
  const s: any = self
  if (s["_tag"] === "Left") {
    return Either.left(f(s.left))
  }
  if (s["_tag"] === "Right") {
    return s
  }
  return Effect.mapError(self, f)
}

/**
 * @category optimisation
 * @since 1.0.0
 */
export const bimap = <A, B>(
  self: ParseResult<A>,
  f: (error: ParseError) => ParseError,
  g: (a: A) => B
): ParseResult<B> => {
  const s: any = self
  if (s["_tag"] === "Left") {
    return Either.left(f(s.left))
  }
  if (s["_tag"] === "Right") {
    return Either.right(g(s.right))
  }
  return Effect.mapBoth(self, { onFailure: f, onSuccess: g })
}

/**
 * @category optimisation
 * @since 1.0.0
 */
export const orElse = <A>(
  self: ParseResult<A>,
  f: (error: ParseError) => ParseResult<A>
): ParseResult<A> => {
  const s: any = self
  if (s["_tag"] === "Left") {
    return f(s.left)
  }
  if (s["_tag"] === "Right") {
    return s
  }
  return Effect.catchAll(self, f)
}
