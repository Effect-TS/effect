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
  <A, R2, E2, B>(
    f: (self: A) => Effect.Effect<R2, E2, B>
  ): <R1, E1>(self: Effect.Effect<R1, E1, A>) => Effect.Effect<R1 | R2, E1 | E2, B>
  <R1, E1, A, R2, E2, B>(
    self: Effect.Effect<R1, E1, A>,
    f: (self: A) => Effect.Effect<R2, E2, B>
  ): Effect.Effect<R1 | R2, E1 | E2, B>
} = dual(2, <R1, E1, A, R2, E2, B>(
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
})

/** @internal */
export const map: {
  <A, B>(f: (self: A) => B): <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, B>
  <R, E, A, B>(self: Effect.Effect<R, E, A>, f: (self: A) => B): Effect.Effect<R, E, B>
} = dual(2, <R, E, A, B>(self: Effect.Effect<R, E, A>, f: (self: A) => B): Effect.Effect<R, E, B> => {
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
  <E1, E2>(f: (error: E1) => E2): <R, A>(self: Effect.Effect<R, E1, A>) => Effect.Effect<R, E2, A>
  <R, E1, A, E2>(self: Effect.Effect<R, E1, A>, f: (error: E1) => E2): Effect.Effect<R, E2, A>
} = dual(2, <R, E1, A, E2>(
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
})

/** @internal */
export const eitherOrUndefined = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Either.Either<E, A> | undefined => {
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
export const forbidden = (actual: unknown, message?: string): ParseResult.Forbidden => ({
  _tag: "Forbidden",
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
