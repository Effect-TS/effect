/**
 * @since 1.0.0
 */

import { TaggedError } from "effect/Data"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { dual } from "effect/Function"
import type { LazyArg } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
import type * as AST from "./AST.js"
import type * as _parseResult from "./internal/parseResult.js"
import * as TreeFormatter from "./TreeFormatter.js"

type ParseIssue = _parseResult.ParseIssue

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
export const succeed: <A>(a: A) => Either.Either<A, ParseIssue> = Either.right

/**
 * @category constructors
 * @since 1.0.0
 */
export const fail: (issue: ParseIssue) => Either.Either<never, ParseIssue> = Either.left

const _try: <A>(options: {
  try: LazyArg<A>
  catch: (e: unknown) => ParseIssue
}) => Either.Either<A, ParseIssue> = Either.try

export {
  /**
   * @category constructors
   * @since 1.0.0
   */
  _try as try
}

export {
  /**
   * Error that occurs when a declaration has an error.
   *
   * @category model
   * @since 1.0.0
   */
  Declaration,
  /**
   * @category optimisation
   * @since 1.0.0
   */
  eitherOrUndefined,
  /**
   * @category optimisation
   * @since 1.0.0
   */
  flatMap,
  /**
   * The `Forbidden` variant of the `ParseIssue` type represents an error that occurs when an Effect is encounter but disallowed from execution.
   *
   * @category model
   * @since 1.0.0
   */
  Forbidden,
  /**
   * The `Index` error indicates that there was an error at a specific index in an array or tuple.
   *
   * @category model
   * @since 1.0.0
   */
  Index,
  /**
   * The `Key` variant of the `ParseIssue` type represents an error that occurs when a key in a type literal or record is invalid.
   *
   * @category model
   * @since 1.0.0
   */
  Key,
  /**
   * @category optimisation
   * @since 1.0.0
   */
  map,
  /**
   * @category optimisation
   * @since 1.0.0
   */
  mapError,
  /**
   * Error that occurs when a member in a union has an error.
   *
   * @category model
   * @since 1.0.0
   */
  Member,
  /**
   * Error that occurs when a required key or index is missing.
   *
   * @category model
   * @since 1.0.0
   */
  Missing,
  /**
   * @category constructors
   * @since 1.0.0
   */
  missing,
  /**
   * Error that occurs when a refinement has an error.
   *
   * @category model
   * @since 1.0.0
   */
  Refinement,
  /**
   * Error that occurs when a transformation has an error.
   *
   * @category model
   * @since 1.0.0
   */
  Transform,
  /**
   * Error that occurs when an array or tuple has an error.
   *
   * @category model
   * @since 1.0.0
   */
  Tuple,
  /**
   * The `Type` variant of the `ParseIssue` type represents an error that occurs when the `actual` value is not of the expected type.
   * The `ast` field specifies the expected type, and the `actual` field contains the value that caused the error.
   *
   * @category model
   * @since 1.0.0
   */
  Type,
  /**
   * Error that occurs when a type literal or record has an error.
   *
   * @category model
   * @since 1.0.0
   */
  TypeLiteral,
  /**
   * Error that occurs when an unexpected key or index is present.
   *
   * @category model
   * @since 1.0.0
   */
  Unexpected,
  /**
   * Error that occurs when a union has an error.
   *
   * @category model
   * @since 1.0.0
   */
  Union
} from "./internal/parseResult.js"

export type {
  /**
   * `ParseIssue` is a type that represents the different types of errors that can occur when decoding/encoding a value.
   *
   * @category model
   * @since 1.0.0
   */
  ParseIssue
} from "./internal/parseResult.js"

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
