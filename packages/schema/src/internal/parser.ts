/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import type * as ReadonlyArray from "effect/ReadonlyArray"
import type * as AST from "../AST.js"
import type * as ParseResult from "../ParseResult.js"

/** @internal */
export const flatMap: {
  <A, B, E1, R1>(
    f: (a: A) => Effect.Effect<B, E1, R1>
  ): <E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<B, E1 | E, R1 | R>
  <A, E, R, B, E1, R1>(
    self: Effect.Effect<A, E, R>,
    f: (a: A) => Effect.Effect<B, E1, R1>
  ): Effect.Effect<B, E | E1, R | R1>
} = dual(2, <A, E, R, B, E1, R1>(
  self: Effect.Effect<A, E, R>,
  f: (a: A) => Effect.Effect<B, E1, R1>
): Effect.Effect<B, E | E1, R | R1> => {
  const s: any = self
  if (s["_tag"] === "Left") {
    return s
  }
  if (s["_tag"] === "Right") {
    return f(s.right)
  }
  return Effect.flatMap(self, f)
})

/** @internal */
export const map: {
  <A, B>(f: (a: A) => B): <E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<B, E, R>
  <A, E, R, B>(self: Effect.Effect<A, E, R>, f: (a: A) => B): Effect.Effect<B, E, R>
} = dual(2, <A, E, R, B>(self: Effect.Effect<A, E, R>, f: (a: A) => B): Effect.Effect<B, E, R> => {
  const s: any = self
  if (s["_tag"] === "Left") {
    return s
  }
  if (s["_tag"] === "Right") {
    return Either.right(f(s.right))
  }
  return Effect.map(self, f)
})

/** @internal */
export const mapError: {
  <E, E2>(f: (e: E) => E2): <A, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E2, R>
  <A, E, R, E2>(self: Effect.Effect<A, E, R>, f: (e: E) => E2): Effect.Effect<A, E2, R>
} = dual(2, <A, E, R, E2>(self: Effect.Effect<A, E, R>, f: (e: E) => E2): Effect.Effect<A, E2, R> => {
  const s: any = self
  if (s["_tag"] === "Left") {
    return Either.left(f(s.left))
  }
  if (s["_tag"] === "Right") {
    return s
  }
  return Effect.mapError(self, f)
})

/** @internal */
export const eitherOrUndefined = <A, E, R>(
  self: Effect.Effect<A, E, R>
): Either.Either<A, E> | undefined => {
  const s: any = self
  if (s["_tag"] === "Left" || s["_tag"] === "Right") {
    return s
  }
}

/** @internal */
export const declaration = (
  ast: AST.Declaration,
  actual: unknown,
  error: ParseResult.ParseIssue
): ParseResult.Declaration => ({ _tag: "Declaration", ast, actual, error })

/** @internal */
export const refinement = (
  ast: AST.Refinement,
  actual: unknown,
  kind: "From" | "Predicate",
  error: ParseResult.ParseIssue
): ParseResult.Refinement => ({ _tag: "Refinement", ast, actual, kind, error })

/** @internal */
export const tuple = (
  ast: AST.Tuple,
  actual: unknown,
  errors: ReadonlyArray.NonEmptyReadonlyArray<ParseResult.Index>
): ParseResult.Tuple => ({ _tag: "Tuple", ast, actual, errors })

/** @internal */
export const index = (
  index: number,
  error: ParseResult.ParseIssue | ParseResult.Missing | ParseResult.Unexpected
): ParseResult.Index => ({ _tag: "Index", index, error })

/** @internal */
export const typeLiteral = (
  ast: AST.TypeLiteral,
  actual: unknown,
  errors: ReadonlyArray.NonEmptyReadonlyArray<ParseResult.Key>
): ParseResult.TypeLiteral => ({ _tag: "TypeLiteral", ast, actual, errors })

/** @internal */
export const key = (
  key: PropertyKey,
  error: ParseResult.ParseIssue | ParseResult.Missing | ParseResult.Unexpected
): ParseResult.Key => ({ _tag: "Key", key, error })

/** @internal */
export const unexpected = (
  ast: AST.AST
): ParseResult.Unexpected => ({ _tag: "Unexpected", ast })

/** @internal */
export const transform = (
  ast: AST.Transform,
  actual: unknown,
  kind: "From" | "Transformation" | "To",
  error: ParseResult.ParseIssue
): ParseResult.Transform => ({ _tag: "Transform", ast, actual, kind, error })

/** @internal */
export const type = (ast: AST.AST, actual: unknown, message?: string): ParseResult.Type => ({
  _tag: "Type",
  ast,
  actual,
  message: Option.fromNullable(message)
})

/** @internal */
export const forbidden = (ast: AST.AST, actual: unknown, message?: string): ParseResult.Forbidden => ({
  _tag: "Forbidden",
  ast,
  actual,
  message: Option.fromNullable(message)
})

/** @internal */
export const missing: ParseResult.Missing = { _tag: "Missing" }

/** @internal */
export const member = (
  ast: AST.AST,
  error: ParseResult.ParseIssue
): ParseResult.Member => ({ _tag: "Member", ast, error })

/** @internal */
export const union = (
  ast: AST.Union,
  actual: unknown,
  errors: ReadonlyArray.NonEmptyReadonlyArray<ParseResult.Type | ParseResult.TypeLiteral | ParseResult.Member>
): ParseResult.Union => ({ _tag: "Union", ast, actual, errors })
