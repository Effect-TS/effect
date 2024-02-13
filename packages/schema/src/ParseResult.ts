/**
 * @since 1.0.0
 */

import { TaggedError } from "effect/Data"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { dual } from "effect/Function"
import type { LazyArg } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
import type * as Option from "effect/Option"
import type * as ReadonlyArray from "effect/ReadonlyArray"
import type * as AST from "./AST.js"
import * as InternalParser from "./internal/parser.js"
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
export const parseError = (issue: ParseIssue): ParseError => new ParseError({ error: issue })

/**
 * @category constructors
 * @since 1.0.0
 */
export const succeed: <A>(a: A) => Either.Either<ParseIssue, A> = Either.right

/**
 * @category constructors
 * @since 1.0.0
 */
export const fail: (issue: ParseIssue) => Either.Either<ParseIssue, never> = Either.left

const _try: <A>(options: {
  try: LazyArg<A>
  catch: (e: unknown) => ParseIssue
}) => Either.Either<ParseIssue, A> = Either.try

export {
  /**
   * @category constructors
   * @since 1.0.0
   */
  _try as try
}

/**
 * `ParseIssue` is a type that represents the different types of errors that can occur when decoding/encoding a value.
 *
 * @category model
 * @since 1.0.0
 */
export type ParseIssue =
  | Declaration
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
export const transform = InternalParser.transform

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
export const type = InternalParser.type

/**
 * The `Forbidden` variant of the `ParseIssue` type represents an error that occurs when an Effect is encounter but disallowed from execution.
 *
 * @category model
 * @since 1.0.0
 */
export interface Forbidden {
  readonly _tag: "Forbidden"
  readonly ast: AST.AST
  readonly actual: unknown
  readonly message: Option.Option<string>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const forbidden = InternalParser.forbidden

/**
 * Error that occurs when a declaration has an error.
 *
 * @category model
 * @since 1.0.0
 */
export interface Declaration {
  readonly _tag: "Declaration"
  readonly ast: AST.Declaration
  readonly actual: unknown
  readonly error: ParseIssue
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const declaration = InternalParser.declaration

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
export const refinement = InternalParser.refinement

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
export const typeLiteral = InternalParser.typeLiteral

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
export const index = InternalParser.index

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
export const key = InternalParser.key

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
export const missing: Missing = InternalParser.missing

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
export const unexpected = InternalParser.unexpected

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
export const union = InternalParser.union

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
export const member = InternalParser.member

/**
 * @category optimisation
 * @since 1.0.0
 */
export const eitherOrUndefined = InternalParser.eitherOrUndefined

/**
 * @category optimisation
 * @since 1.0.0
 */
export const flatMap = InternalParser.flatMap

/**
 * @category optimisation
 * @since 1.0.0
 */
export const map = InternalParser.map

/**
 * @category optimisation
 * @since 1.0.0
 */
export const mapError = InternalParser.mapError

/**
 * @category optimisation
 * @since 1.0.0
 */
export const mapBoth: {
  <E, E2, A, A2>(
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ): <R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A2, E2, R>
  <A, E, R, E2, A2>(
    self: Effect.Effect<A, E, R>,
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ): Effect.Effect<A2, E2, R>
} = dual(2, <A, E, R, E2, A2>(
  self: Effect.Effect<A, E, R>,
  options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
): Effect.Effect<A2, E2, R> => {
  const s: any = self
  if (s["_tag"] === "Left") {
    return Either.left(options.onFailure(s.left))
  }
  if (s["_tag"] === "Right") {
    return Either.right(options.onSuccess(s.right))
  }
  return Effect.mapBoth(self, options)
})

/**
 * @category optimisation
 * @since 1.0.0
 */
export const orElse: {
  <E, A2, E2, R2>(
    f: (e: E) => Effect.Effect<A2, E2, R2>
  ): <A, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A2 | A, E2, R2 | R>
  <A, E, R, A2, E2, R2>(
    self: Effect.Effect<A, E, R>,
    f: (e: E) => Effect.Effect<A2, E2, R2>
  ): Effect.Effect<A2 | A, E2, R2 | R>
} = dual(2, <A, E, R, A2, E2, R2>(
  self: Effect.Effect<A, E, R>,
  f: (e: E) => Effect.Effect<A2, E2, R2>
): Effect.Effect<A2 | A, E2, R2 | R> => {
  const s: any = self
  if (s["_tag"] === "Left") {
    return f(s.left)
  }
  if (s["_tag"] === "Right") {
    return s
  }
  return Effect.catchAll(self, f)
})

/* c8 ignore start */
export {
  /**
   * @category decoding
   * @since 1.0.0
   */
  decode,
  /**
   * @category decoding
   * @since 1.0.0
   */
  decodeUnknown,
  /**
   * @category decoding
   * @since 1.0.0
   */
  decodeUnknownEither,
  /**
   * @category decoding
   * @since 1.0.0
   */
  decodeUnknownOption,
  /**
   * @category decoding
   * @since 1.0.0
   */
  decodeUnknownPromise,
  /**
   * @category decoding
   * @since 1.0.0
   */
  decodeUnknownSync,
  /**
   * @category encoding
   * @since 1.0.0
   */
  encode,
  /**
   * @category encoding
   * @since 1.0.0
   */
  encodeUnknown,
  /**
   * @category encoding
   * @since 1.0.0
   */
  encodeUnknownEither,
  /**
   * @category encoding
   * @since 1.0.0
   */
  encodeUnknownOption,
  /**
   * @category encoding
   * @since 1.0.0
   */
  encodeUnknownPromise,
  /**
   * @category encoding
   * @since 1.0.0
   */
  encodeUnknownSync
} from "./Parser.js"
/* c8 ignore end */

/**
 * @since 1.0.0
 */
export type DecodeUnknown<Out, R> = (u: unknown, options?: AST.ParseOptions) => Effect.Effect<Out, ParseIssue, R>

/**
 * @since 1.0.0
 */
export type DeclarationDecodeUnknown<Out, R> = (
  u: unknown,
  options: AST.ParseOptions,
  ast: AST.Declaration
) => Effect.Effect<Out, ParseIssue, R>
