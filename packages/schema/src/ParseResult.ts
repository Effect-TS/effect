/**
 * @since 1.0.0
 */

import { TaggedError } from "effect/Data"
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
export class ParseError extends TaggedError("ParseError")<{ readonly error: ParseIssue }> {
  get message() {
    return this.toString()
  }
  /**
   * @since 1.0.0
   */
  toString() {
    return TreeFormatter.formatIssue(this.error)
  }
  /**
   * @since 1.0.0
   */
  toJSON() {
    return {
      _id: "ParseError",
      message: this.toString()
    }
  }
  /**
   * @since 1.0.0
   */
  [Inspectable.NodeInspectSymbol]() {
    return this.toJSON()
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const parseError = (error: ParseIssue): ParseError => new ParseError({ error })

/**
 * @category constructors
 * @since 1.0.0
 */
export const succeed: <A>(a: A) => Either.Either<never, A> = Either.right

/**
 * @category constructors
 * @since 1.0.0
 */
export const fail = (error: ParseIssue): Either.Either<ParseError, never> => Either.left(parseError(error))

/**
 * `ParseIssue` is a type that represents the different types of errors that can occur when decoding/encoding a value.
 *
 * @category model
 * @since 1.0.0
 */
export type ParseIssue =
  | Refinement
  | Tuple
  | TypeLiteral
  | Union
  | Transform
  | Type
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
  readonly actual: unknown
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const forbidden = (actual: unknown): Forbidden => ({
  _tag: "Forbidden",
  actual
})

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
  readonly error: ParseIssue | Missing | Unexpected
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const index = (
  index: number,
  error: ParseIssue | Missing | Unexpected
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
  readonly error: ParseIssue | Missing | Unexpected
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const key = (
  key: PropertyKey,
  error: ParseIssue | Missing | Unexpected
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
  readonly errors: ReadonlyArray.NonEmptyReadonlyArray<Type | TypeLiteral | Member>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const union = (
  ast: AST.Union,
  actual: unknown,
  errors: ReadonlyArray.NonEmptyReadonlyArray<Type | TypeLiteral | Member>
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
}) => Either.Either<ParseError, A> = Either.try

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
export const eitherOrUndefined = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Either.Either<E, A> | undefined => {
  const s: any = self
  if (s["_tag"] === "Left" || s["_tag"] === "Right") {
    return s
  }
}

/**
 * @category optimisation
 * @since 1.0.0
 */
export const flatMap = <R1, E1, A, R2, E2, B>(
  self: Effect.Effect<R1, E1, A>,
  f: (self: A) => Effect.Effect<R2, E2, B>
): Effect.Effect<R1 | R2, E1 | E2, B> => {
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
export const map = <R, E, A, B>(self: Effect.Effect<R, E, A>, f: (self: A) => B): Effect.Effect<R, E, B> => {
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
export const mapError = <R, E1, A, E2>(
  self: Effect.Effect<R, E1, A>,
  f: (error: E1) => E2
): Effect.Effect<R, E2, A> => {
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
export const mapBoth = <R, E1, A, E2, B>(
  self: Effect.Effect<R, E1, A>,
  f: (error: E1) => E2,
  g: (a: A) => B
): Effect.Effect<R, E2, B> => {
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
export const orElse = <R1, E1, A, R2, E2, B>(
  self: Effect.Effect<R1, E1, A>,
  f: (error: E1) => Effect.Effect<R2, E2, B>
): Effect.Effect<R1 | R2, E2, A | B> => {
  const s: any = self
  if (s["_tag"] === "Left") {
    return f(s.left)
  }
  if (s["_tag"] === "Right") {
    return s
  }
  return Effect.catchAll(self, f)
}
