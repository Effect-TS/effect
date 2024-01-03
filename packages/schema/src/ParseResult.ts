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
  readonly error: ParseIssue
}

class ParseErrorImpl implements Inspectable.Inspectable {
  readonly _tag = "ParseError"
  constructor(readonly error: ParseIssue) {}
  toString() {
    return TreeFormatter.formatError(this.error)
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
 * @category constructors
 * @since 1.0.0
 */
export const parseError = (error: ParseIssue): ParseError => new ParseErrorImpl(error)

/**
 * @category constructors
 * @since 1.0.0
 */
export const succeed: <A>(a: A) => ParseResult<A> = Either.right

/**
 * @category constructors
 * @since 1.0.0
 */
export const fail = (error: ParseIssue): ParseResult<never> => Either.left(parseError(error))

/**
 * `ParseErrors` is a type that represents the different types of errors that can occur when decoding/encoding a value.
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
  readonly error: ParseIssue
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const transform = (
  ast: AST.Transform,
  actual: unknown,
  kind: "From" | "Transformation" | "To",
  error: ParseIssue
): Transform => ({ _tag: "Transform", ast, actual, kind, error })

/**
 * The `Type` variant of the `ParseIssue` type represents an error that occurs when the `actual` value is not of the expected type.
 * The `ast` field specifies the expected type, and the `actual` field contains the value that caused the error.
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
 * Error that occurs when a refinement has an error.
 *
 * @category model
 * @since 1.0.0
 */
export interface Refinement {
  readonly _tag: "Refinement"
  readonly ast: AST.Refinement
  readonly actual: unknown
  readonly kind: "From" | "Predicate"
  readonly error: ParseIssue
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const refinement = (
  ast: AST.Refinement,
  actual: unknown,
  kind: "From" | "Predicate",
  error: ParseIssue
): Refinement => ({ _tag: "Refinement", ast, actual, kind, error })

/**
 * Error that occurs when an array or tuple has an error.
 *
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
 * Error that occurs when a type literal or record has an error.
 *
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
 * The `Index` error indicates that there was an error at a specific index in an array or tuple.
 *
 * @category model
 * @since 1.0.0
 */
export interface Index {
  readonly _tag: "Index"
  readonly index: number
  readonly error: ParseIssue
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const index = (
  index: number,
  error: ParseIssue
): Index => ({ _tag: "Index", index, error })

/**
 * The `Key` variant of the `ParseIssue` type represents an error that occurs when a key in a type literal or record is invalid.
 *
 * @category model
 * @since 1.0.0
 */
export interface Key {
  readonly _tag: "Key"
  readonly key: PropertyKey
  readonly error: ParseIssue
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const key = (
  key: PropertyKey,
  error: ParseIssue
): Key => ({ _tag: "Key", key, error })

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
  readonly error: ParseIssue
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const member = (
  ast: AST.AST,
  error: ParseIssue
): Member => ({ _tag: "Member", ast, error })

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
