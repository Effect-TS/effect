import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import type * as ReadonlyArray from "effect/ReadonlyArray"
import type * as AST from "../AST.js"

/** @internal */
export type ParseIssue =
  | Declaration
  | Refinement
  | Tuple
  | TypeLiteral
  | Union
  | Transform
  | Type
  | Forbidden

/** @internal */
export class Declaration {
  readonly _tag = "Declaration"
  constructor(readonly ast: AST.Declaration, readonly actual: unknown, readonly error: ParseIssue) {}
}

/** @internal */
export class Refinement {
  readonly _tag = "Refinement"
  constructor(
    readonly ast: AST.Refinement<AST.AST>,
    readonly actual: unknown,
    readonly kind: "From" | "Predicate",
    readonly error: ParseIssue
  ) {}
}

/** @internal */
export class Tuple {
  readonly _tag = "Tuple"
  constructor(
    readonly ast: AST.Tuple,
    readonly actual: unknown,
    readonly errors: ReadonlyArray.NonEmptyReadonlyArray<Index>
  ) {}
}

/** @internal */
export class Index {
  readonly _tag = "Index"
  constructor(readonly index: number, readonly error: ParseIssue | Missing | Unexpected) {}
}

/** @internal */
export class TypeLiteral {
  readonly _tag = "TypeLiteral"
  constructor(
    readonly ast: AST.TypeLiteral,
    readonly actual: unknown,
    readonly errors: ReadonlyArray.NonEmptyReadonlyArray<Key>
  ) {}
}

/** @internal */
export class Key {
  readonly _tag = "Key"
  constructor(readonly key: PropertyKey, readonly error: ParseIssue | Missing | Unexpected) {}
}

/** @internal */
export class Unexpected {
  readonly _tag = "Unexpected"
  constructor(readonly ast: AST.AST) {}
}

/** @internal */
export class Transform {
  readonly _tag = "Transform"
  constructor(
    readonly ast: AST.Transform,
    readonly actual: unknown,
    readonly kind: "Encoded" | "Transformation" | "Type",
    readonly error: ParseIssue
  ) {}
}

/** @internal */
export class Type {
  readonly _tag = "Type"
  readonly message: Option.Option<string>
  constructor(readonly ast: AST.AST, readonly actual: unknown, message?: string) {
    this.message = Option.fromNullable(message)
  }
}

/** @internal */
export class Forbidden {
  readonly _tag = "Forbidden"
  readonly message: Option.Option<string>
  constructor(readonly ast: AST.AST, readonly actual: unknown, message?: string) {
    this.message = Option.fromNullable(message)
  }
}

/** @internal */
export class Missing {
  readonly _tag = "Missing"
}

/** @internal */
export const missing: Missing = new Missing()

/** @internal */
export class Member {
  readonly _tag = "Member"
  constructor(readonly ast: AST.AST, readonly error: ParseIssue) {}
}

/** @internal */
export class Union {
  readonly _tag = "Union"
  constructor(
    readonly ast: AST.Union,
    readonly actual: unknown,
    readonly errors: ReadonlyArray.NonEmptyReadonlyArray<Type | TypeLiteral | Member>
  ) {}
}

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
