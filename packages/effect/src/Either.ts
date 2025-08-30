/**
 * @since 2.0.0
 */

import * as Equivalence from "./Equivalence.js"
import type { LazyArg } from "./Function.js"
import { constNull, constUndefined, dual, identity } from "./Function.js"
import type { TypeLambda } from "./HKT.js"
import type { Inspectable } from "./Inspectable.js"
import * as doNotation from "./internal/doNotation.js"
import * as either from "./internal/either.js"
import * as option_ from "./internal/option.js"
import type { Option } from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type { Predicate, Refinement } from "./Predicate.js"
import { isFunction } from "./Predicate.js"
import type { Covariant, NoInfer, NotFunction } from "./Types.js"
import type * as Unify from "./Unify.js"
import * as Gen from "./Utils.js"

/**
 * @category models
 * @since 2.0.0
 */
export type Either<R, L = never> = Left<L, R> | Right<L, R>

/**
 * @category symbols
 * @since 2.0.0
 */
export const TypeId: unique symbol = either.TypeId

/**
 * @category symbols
 * @since 2.0.0
 */
export type TypeId = typeof TypeId

// TODO(4.0): flip the order of the type parameters
/**
 * @category models
 * @since 2.0.0
 */
export interface Left<out L, out R> extends Pipeable, Inspectable {
  readonly _tag: "Left"
  readonly _op: "Left"
  readonly left: L
  readonly [TypeId]: {
    readonly _R: Covariant<R>
    readonly _L: Covariant<L>
  }
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: EitherUnify<this>
  [Unify.ignoreSymbol]?: EitherUnifyIgnore
}

// TODO(4.0): flip the order of the type parameters
/**
 * @category models
 * @since 2.0.0
 */
export interface Right<out L, out R> extends Pipeable, Inspectable {
  readonly _tag: "Right"
  readonly _op: "Right"
  readonly right: R
  readonly [TypeId]: {
    readonly _R: Covariant<R>
    readonly _L: Covariant<L>
  }
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: EitherUnify<this>
  [Unify.ignoreSymbol]?: EitherUnifyIgnore
}

/**
 * @category models
 * @since 2.0.0
 */
export interface EitherUnify<A extends { [Unify.typeSymbol]?: any }> {
  Either?: () => A[Unify.typeSymbol] extends Either<infer R0, infer L0> | infer _ ? Either<R0, L0> : never
}

/**
 * @category models
 * @since 2.0.0
 */
export interface EitherUnifyIgnore {}

/**
 * @category type lambdas
 * @since 2.0.0
 */
export interface EitherTypeLambda extends TypeLambda {
  readonly type: Either<this["Target"], this["Out1"]>
}

/**
 * @since 2.0.0
 */
export declare namespace Either {
  /**
   * @since 2.0.0
   * @category type-level
   */
  export type Left<T extends Either<any, any>> = [T] extends [Either<infer _A, infer _E>] ? _E : never
  /**
   * @since 2.0.0
   * @category type-level
   */
  export type Right<T extends Either<any, any>> = [T] extends [Either<infer _A, infer _E>] ? _A : never
}

/**
 * Constructs a new `Either` holding a `Right` value. This usually represents a successful value due to the right bias
 * of this structure.
 *
 * @category constructors
 * @since 2.0.0
 */
export const right: <R>(right: R) => Either<R> = either.right

const void_: Either<void> = right(void 0)
export {
  /**
   * @category constructors
   * @since 3.13.0
   */
  void_ as void
}

/**
 * Constructs a new `Either` holding a `Left` value. This usually represents a failure, due to the right-bias of this
 * structure.
 *
 * @category constructors
 * @since 2.0.0
 */
export const left: <L>(left: L) => Either<never, L> = either.left

/**
 * Takes a lazy default and a nullable value, if the value is not nully (`null` or `undefined`), turn it into a `Right`, if the value is nully use
 * the provided default as a `Left`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Either } from "effect"
 *
 * assert.deepStrictEqual(Either.fromNullable(1, () => 'fallback'), Either.right(1))
 * assert.deepStrictEqual(Either.fromNullable(null, () => 'fallback'), Either.left('fallback'))
 * ```
 *
 * @category constructors
 * @since 2.0.0
 */
export const fromNullable: {
  /**
   * Takes a lazy default and a nullable value, if the value is not nully (`null` or `undefined`), turn it into a `Right`, if the value is nully use
   * the provided default as a `Left`.
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { Either } from "effect"
   *
   * assert.deepStrictEqual(Either.fromNullable(1, () => 'fallback'), Either.right(1))
   * assert.deepStrictEqual(Either.fromNullable(null, () => 'fallback'), Either.left('fallback'))
   * ```
   *
   * @category constructors
   * @since 2.0.0
   */
  <R, L>(onNullable: (right: R) => L): (self: R) => Either<NonNullable<R>, L>
  /**
   * Takes a lazy default and a nullable value, if the value is not nully (`null` or `undefined`), turn it into a `Right`, if the value is nully use
   * the provided default as a `Left`.
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { Either } from "effect"
   *
   * assert.deepStrictEqual(Either.fromNullable(1, () => 'fallback'), Either.right(1))
   * assert.deepStrictEqual(Either.fromNullable(null, () => 'fallback'), Either.left('fallback'))
   * ```
   *
   * @category constructors
   * @since 2.0.0
   */
  <R, L>(self: R, onNullable: (right: R) => L): Either<NonNullable<R>, L>
} = dual(
  2,
  <R, L>(self: R, onNullable: (right: R) => L): Either<NonNullable<R>, L> =>
    self == null ? left(onNullable(self)) : right(self)
)

/**
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Either, Option } from "effect"
 *
 * assert.deepStrictEqual(Either.fromOption(Option.some(1), () => 'error'), Either.right(1))
 * assert.deepStrictEqual(Either.fromOption(Option.none(), () => 'error'), Either.left('error'))
 * ```
 *
 * @category constructors
 * @since 2.0.0
 */
export const fromOption: {
  /**
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { Either, Option } from "effect"
   *
   * assert.deepStrictEqual(Either.fromOption(Option.some(1), () => 'error'), Either.right(1))
   * assert.deepStrictEqual(Either.fromOption(Option.none(), () => 'error'), Either.left('error'))
   * ```
   *
   * @category constructors
   * @since 2.0.0
   */
  <L>(onNone: () => L): <R>(self: Option<R>) => Either<R, L>
  /**
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { Either, Option } from "effect"
   *
   * assert.deepStrictEqual(Either.fromOption(Option.some(1), () => 'error'), Either.right(1))
   * assert.deepStrictEqual(Either.fromOption(Option.none(), () => 'error'), Either.left('error'))
   * ```
   *
   * @category constructors
   * @since 2.0.0
   */
  <R, L>(self: Option<R>, onNone: () => L): Either<R, L>
} = either.fromOption

const try_: {
  <R, L>(
    options: {
      readonly try: LazyArg<R>
      readonly catch: (error: unknown) => L
    }
  ): Either<R, L>
  <R>(evaluate: LazyArg<R>): Either<R, unknown>
} = (<R, L>(
  evaluate: LazyArg<R> | {
    readonly try: LazyArg<R>
    readonly catch: (error: unknown) => L
  }
) => {
  if (isFunction(evaluate)) {
    try {
      return right(evaluate())
    } catch (e) {
      return left(e)
    }
  } else {
    try {
      return right(evaluate.try())
    } catch (e) {
      return left(evaluate.catch(e))
    }
  }
}) as any

export {
  /**
   * Imports a synchronous side-effect into a pure `Either` value, translating any
   * thrown exceptions into typed failed eithers creating with `Either.left`.
   *
   * @category constructors
   * @since 2.0.0
   */
  try_ as try
}

/**
 * Tests if a value is a `Either`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Either } from "effect"
 *
 * assert.deepStrictEqual(Either.isEither(Either.right(1)), true)
 * assert.deepStrictEqual(Either.isEither(Either.left("a")), true)
 * assert.deepStrictEqual(Either.isEither({ right: 1 }), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isEither: (input: unknown) => input is Either<unknown, unknown> = either.isEither

/**
 * Determine if a `Either` is a `Left`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Either } from "effect"
 *
 * assert.deepStrictEqual(Either.isLeft(Either.right(1)), false)
 * assert.deepStrictEqual(Either.isLeft(Either.left("a")), true)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isLeft: <R, L>(self: Either<R, L>) => self is Left<L, R> = either.isLeft

/**
 * Determine if a `Either` is a `Right`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Either } from "effect"
 *
 * assert.deepStrictEqual(Either.isRight(Either.right(1)), true)
 * assert.deepStrictEqual(Either.isRight(Either.left("a")), false)
 * ```
 *
 * @category guards
 * @since 2.0.0
 */
export const isRight: <R, L>(self: Either<R, L>) => self is Right<L, R> = either.isRight

/**
 * Converts a `Either` to an `Option` discarding the `Left`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Either, Option } from "effect"
 *
 * assert.deepStrictEqual(Either.getRight(Either.right('ok')), Option.some('ok'))
 * assert.deepStrictEqual(Either.getRight(Either.left('err')), Option.none())
 * ```
 *
 * @category getters
 * @since 2.0.0
 */
export const getRight: <R, L>(self: Either<R, L>) => Option<R> = either.getRight

/**
 * Converts a `Either` to an `Option` discarding the value.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Either, Option } from "effect"
 *
 * assert.deepStrictEqual(Either.getLeft(Either.right('ok')), Option.none())
 * assert.deepStrictEqual(Either.getLeft(Either.left('err')), Option.some('err'))
 * ```
 *
 * @category getters
 * @since 2.0.0
 */
export const getLeft: <R, L>(self: Either<R, L>) => Option<L> = either.getLeft

/**
 * @category equivalence
 * @since 2.0.0
 */
export const getEquivalence = <R, L>({ left, right }: {
  right: Equivalence.Equivalence<R>
  left: Equivalence.Equivalence<L>
}): Equivalence.Equivalence<Either<R, L>> =>
  Equivalence.make((x, y) =>
    isLeft(x) ?
      isLeft(y) && left(x.left, y.left) :
      isRight(y) && right(x.right, y.right)
  )

/**
 * @category mapping
 * @since 2.0.0
 */
export const mapBoth: {
  /**
   * @category mapping
   * @since 2.0.0
   */
  <L, L2, R, R2>(
    options: {
      readonly onLeft: (left: L) => L2
      readonly onRight: (right: R) => R2
    }
  ): (self: Either<R, L>) => Either<R2, L2>
  /**
   * @category mapping
   * @since 2.0.0
   */
  <L, R, L2, R2>(
    self: Either<R, L>,
    options: {
      readonly onLeft: (left: L) => L2
      readonly onRight: (right: R) => R2
    }
  ): Either<R2, L2>
} = dual(
  2,
  <L, R, L2, R2>(self: Either<R, L>, { onLeft, onRight }: {
    readonly onLeft: (left: L) => L2
    readonly onRight: (right: R) => R2
  }): Either<R2, L2> => isLeft(self) ? left(onLeft(self.left)) : right(onRight(self.right))
)

/**
 * Maps the `Left` side of an `Either` value to a new `Either` value.
 *
 * @category mapping
 * @since 2.0.0
 */
export const mapLeft: {
  /**
   * Maps the `Left` side of an `Either` value to a new `Either` value.
   *
   * @category mapping
   * @since 2.0.0
   */
  <L, L2>(f: (left: L) => L2): <R>(self: Either<R, L>) => Either<R, L2>
  /**
   * Maps the `Left` side of an `Either` value to a new `Either` value.
   *
   * @category mapping
   * @since 2.0.0
   */
  <R, L, L2>(self: Either<R, L>, f: (left: L) => L2): Either<R, L2>
} = dual(
  2,
  <R, L1, L2>(self: Either<R, L1>, f: (left: L1) => L2): Either<R, L2> =>
    isLeft(self) ? left(f(self.left)) : right(self.right)
)

/**
 * Maps the `Right` side of an `Either` value to a new `Either` value.
 *
 * @category mapping
 * @since 2.0.0
 */
export const map: {
  /**
   * Maps the `Right` side of an `Either` value to a new `Either` value.
   *
   * @category mapping
   * @since 2.0.0
   */
  <R, R2>(f: (right: R) => R2): <L>(self: Either<R, L>) => Either<R2, L>
  /**
   * Maps the `Right` side of an `Either` value to a new `Either` value.
   *
   * @category mapping
   * @since 2.0.0
   */
  <R, L, R2>(self: Either<R, L>, f: (right: R) => R2): Either<R2, L>
} = dual(
  2,
  <R1, L, R2>(self: Either<R1, L>, f: (right: R1) => R2): Either<R2, L> =>
    isRight(self) ? right(f(self.right)) : left(self.left)
)

/**
 * Takes two functions and an `Either` value, if the value is a `Left` the inner value is applied to the `onLeft function,
 * if the value is a `Right` the inner value is applied to the `onRight` function.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { pipe, Either } from "effect"
 *
 * const onLeft  = (strings: ReadonlyArray<string>): string => `strings: ${strings.join(', ')}`
 *
 * const onRight = (value: number): string => `Ok: ${value}`
 *
 * assert.deepStrictEqual(pipe(Either.right(1), Either.match({ onLeft, onRight })), 'Ok: 1')
 * assert.deepStrictEqual(
 *   pipe(Either.left(['string 1', 'string 2']), Either.match({ onLeft, onRight })),
 *   'strings: string 1, string 2'
 * )
 * ```
 *
 * @category pattern matching
 * @since 2.0.0
 */
export const match: {
  /**
   * Takes two functions and an `Either` value, if the value is a `Left` the inner value is applied to the `onLeft function,
   * if the value is a `Right` the inner value is applied to the `onRight` function.
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { pipe, Either } from "effect"
   *
   * const onLeft  = (strings: ReadonlyArray<string>): string => `strings: ${strings.join(', ')}`
   *
   * const onRight = (value: number): string => `Ok: ${value}`
   *
   * assert.deepStrictEqual(pipe(Either.right(1), Either.match({ onLeft, onRight })), 'Ok: 1')
   * assert.deepStrictEqual(
   *   pipe(Either.left(['string 1', 'string 2']), Either.match({ onLeft, onRight })),
   *   'strings: string 1, string 2'
   * )
   * ```
   *
   * @category pattern matching
   * @since 2.0.0
   */
  <L, B, R, C = B>(
    options: {
      readonly onLeft: (left: L) => B
      readonly onRight: (right: R) => C
    }
  ): (self: Either<R, L>) => B | C
  /**
   * Takes two functions and an `Either` value, if the value is a `Left` the inner value is applied to the `onLeft function,
   * if the value is a `Right` the inner value is applied to the `onRight` function.
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { pipe, Either } from "effect"
   *
   * const onLeft  = (strings: ReadonlyArray<string>): string => `strings: ${strings.join(', ')}`
   *
   * const onRight = (value: number): string => `Ok: ${value}`
   *
   * assert.deepStrictEqual(pipe(Either.right(1), Either.match({ onLeft, onRight })), 'Ok: 1')
   * assert.deepStrictEqual(
   *   pipe(Either.left(['string 1', 'string 2']), Either.match({ onLeft, onRight })),
   *   'strings: string 1, string 2'
   * )
   * ```
   *
   * @category pattern matching
   * @since 2.0.0
   */
  <R, L, B, C = B>(
    self: Either<R, L>,
    options: {
      readonly onLeft: (left: L) => B
      readonly onRight: (right: R) => C
    }
  ): B | C
} = dual(
  2,
  <R, L, B, C = B>(self: Either<R, L>, { onLeft, onRight }: {
    readonly onLeft: (left: L) => B
    readonly onRight: (right: R) => C
  }): B | C => isLeft(self) ? onLeft(self.left) : onRight(self.right)
)

/**
 * Transforms a `Predicate` function into a `Right` of the input value if the predicate returns `true`
 * or `Left` of the result of the provided function if the predicate returns false
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { pipe, Either } from "effect"
 *
 * const isPositive = (n: number): boolean => n > 0
 * const isPositiveEither = Either.liftPredicate(isPositive, n => `${n} is not positive`)
 *
 * assert.deepStrictEqual(
 *   isPositiveEither(1),
 *   Either.right(1)
 * )
 * assert.deepStrictEqual(
 *   isPositiveEither(0),
 *   Either.left("0 is not positive")
 * )
 * ```
 *
 * @category lifting
 * @since 3.4.0
 */
export const liftPredicate: {
  /**
   * Transforms a `Predicate` function into a `Right` of the input value if the predicate returns `true`
   * or `Left` of the result of the provided function if the predicate returns false
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { pipe, Either } from "effect"
   *
   * const isPositive = (n: number): boolean => n > 0
   * const isPositiveEither = Either.liftPredicate(isPositive, n => `${n} is not positive`)
   *
   * assert.deepStrictEqual(
   *   isPositiveEither(1),
   *   Either.right(1)
   * )
   * assert.deepStrictEqual(
   *   isPositiveEither(0),
   *   Either.left("0 is not positive")
   * )
   * ```
   *
   * @category lifting
   * @since 3.4.0
   */
  <A, B extends A, E>(refinement: Refinement<A, B>, orLeftWith: (a: A) => E): (a: A) => Either<B, E>
  /**
   * Transforms a `Predicate` function into a `Right` of the input value if the predicate returns `true`
   * or `Left` of the result of the provided function if the predicate returns false
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { pipe, Either } from "effect"
   *
   * const isPositive = (n: number): boolean => n > 0
   * const isPositiveEither = Either.liftPredicate(isPositive, n => `${n} is not positive`)
   *
   * assert.deepStrictEqual(
   *   isPositiveEither(1),
   *   Either.right(1)
   * )
   * assert.deepStrictEqual(
   *   isPositiveEither(0),
   *   Either.left("0 is not positive")
   * )
   * ```
   *
   * @category lifting
   * @since 3.4.0
   */
  <B extends A, E, A = B>(predicate: Predicate<A>, orLeftWith: (a: A) => E): (a: B) => Either<B, E>
  /**
   * Transforms a `Predicate` function into a `Right` of the input value if the predicate returns `true`
   * or `Left` of the result of the provided function if the predicate returns false
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { pipe, Either } from "effect"
   *
   * const isPositive = (n: number): boolean => n > 0
   * const isPositiveEither = Either.liftPredicate(isPositive, n => `${n} is not positive`)
   *
   * assert.deepStrictEqual(
   *   isPositiveEither(1),
   *   Either.right(1)
   * )
   * assert.deepStrictEqual(
   *   isPositiveEither(0),
   *   Either.left("0 is not positive")
   * )
   * ```
   *
   * @category lifting
   * @since 3.4.0
   */
  <A, E, B extends A>(self: A, refinement: Refinement<A, B>, orLeftWith: (a: A) => E): Either<B, E>
  /**
   * Transforms a `Predicate` function into a `Right` of the input value if the predicate returns `true`
   * or `Left` of the result of the provided function if the predicate returns false
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { pipe, Either } from "effect"
   *
   * const isPositive = (n: number): boolean => n > 0
   * const isPositiveEither = Either.liftPredicate(isPositive, n => `${n} is not positive`)
   *
   * assert.deepStrictEqual(
   *   isPositiveEither(1),
   *   Either.right(1)
   * )
   * assert.deepStrictEqual(
   *   isPositiveEither(0),
   *   Either.left("0 is not positive")
   * )
   * ```
   *
   * @category lifting
   * @since 3.4.0
   */
  <B extends A, E, A = B>(self: B, predicate: Predicate<A>, orLeftWith: (a: A) => E): Either<B, E>
} = dual(
  3,
  <A, E>(a: A, predicate: Predicate<A>, orLeftWith: (a: A) => E): Either<A, E> =>
    predicate(a) ? right(a) : left(orLeftWith(a))
)

/**
 * Filter the right value with the provided function.
 * If the predicate fails, set the left value with the result of the provided function.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { pipe, Either } from "effect"
 *
 * const isPositive = (n: number): boolean => n > 0
 *
 * assert.deepStrictEqual(
 *   pipe(
 *     Either.right(1),
 *     Either.filterOrLeft(isPositive, n => `${n} is not positive`)
 *   ),
 *   Either.right(1)
 * )
 * assert.deepStrictEqual(
 *   pipe(
 *     Either.right(0),
 *     Either.filterOrLeft(isPositive, n => `${n} is not positive`)
 *   ),
 *   Either.left("0 is not positive")
 * )
 * ```
 *
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const filterOrLeft: {
  /**
   * Filter the right value with the provided function.
   * If the predicate fails, set the left value with the result of the provided function.
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { pipe, Either } from "effect"
   *
   * const isPositive = (n: number): boolean => n > 0
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Either.right(1),
   *     Either.filterOrLeft(isPositive, n => `${n} is not positive`)
   *   ),
   *   Either.right(1)
   * )
   * assert.deepStrictEqual(
   *   pipe(
   *     Either.right(0),
   *     Either.filterOrLeft(isPositive, n => `${n} is not positive`)
   *   ),
   *   Either.left("0 is not positive")
   * )
   * ```
   *
   * @since 2.0.0
   * @category filtering & conditionals
   */
  <R, B extends R, L2>(
    refinement: Refinement<NoInfer<R>, B>,
    orLeftWith: (right: NoInfer<R>) => L2
  ): <L>(self: Either<R, L>) => Either<B, L2 | L>
  /**
   * Filter the right value with the provided function.
   * If the predicate fails, set the left value with the result of the provided function.
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { pipe, Either } from "effect"
   *
   * const isPositive = (n: number): boolean => n > 0
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Either.right(1),
   *     Either.filterOrLeft(isPositive, n => `${n} is not positive`)
   *   ),
   *   Either.right(1)
   * )
   * assert.deepStrictEqual(
   *   pipe(
   *     Either.right(0),
   *     Either.filterOrLeft(isPositive, n => `${n} is not positive`)
   *   ),
   *   Either.left("0 is not positive")
   * )
   * ```
   *
   * @since 2.0.0
   * @category filtering & conditionals
   */
  <R, L2>(predicate: Predicate<NoInfer<R>>, orLeftWith: (right: NoInfer<R>) => L2): <L>(self: Either<R, L>) => Either<R, L2 | L>
  /**
   * Filter the right value with the provided function.
   * If the predicate fails, set the left value with the result of the provided function.
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { pipe, Either } from "effect"
   *
   * const isPositive = (n: number): boolean => n > 0
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Either.right(1),
   *     Either.filterOrLeft(isPositive, n => `${n} is not positive`)
   *   ),
   *   Either.right(1)
   * )
   * assert.deepStrictEqual(
   *   pipe(
   *     Either.right(0),
   *     Either.filterOrLeft(isPositive, n => `${n} is not positive`)
   *   ),
   *   Either.left("0 is not positive")
   * )
   * ```
   *
   * @since 2.0.0
   * @category filtering & conditionals
   */
  <R, L, B extends R, L2>(
    self: Either<R, L>,
    refinement: Refinement<R, B>,
    orLeftWith: (right: R) => L2
  ): Either<B, L | L2>
  /**
   * Filter the right value with the provided function.
   * If the predicate fails, set the left value with the result of the provided function.
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { pipe, Either } from "effect"
   *
   * const isPositive = (n: number): boolean => n > 0
   *
   * assert.deepStrictEqual(
   *   pipe(
   *     Either.right(1),
   *     Either.filterOrLeft(isPositive, n => `${n} is not positive`)
   *   ),
   *   Either.right(1)
   * )
   * assert.deepStrictEqual(
   *   pipe(
   *     Either.right(0),
   *     Either.filterOrLeft(isPositive, n => `${n} is not positive`)
   *   ),
   *   Either.left("0 is not positive")
   * )
   * ```
   *
   * @since 2.0.0
   * @category filtering & conditionals
   */
  <R, L, E2>(self: Either<R, L>, predicate: Predicate<R>, orLeftWith: (right: R) => E2): Either<R, L | E2>
} = dual(3, <R, L, E2>(
  self: Either<R, L>,
  predicate: Predicate<R>,
  orLeftWith: (right: R) => E2
): Either<R, L | E2> => flatMap(self, (r) => predicate(r) ? right(r) : left(orLeftWith(r))))

/**
 * @category getters
 * @since 2.0.0
 */
export const merge: <R, L>(self: Either<R, L>) => L | R = match({
  onLeft: identity,
  onRight: identity
})

/**
 * Returns the wrapped value if it's a `Right` or a default value if is a `Left`.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Either } from "effect"
 *
 * assert.deepStrictEqual(Either.getOrElse(Either.right(1), (error) => error + "!"), 1)
 * assert.deepStrictEqual(Either.getOrElse(Either.left("not a number"), (error) => error + "!"), "not a number!")
 * ```
 *
 * @category getters
 * @since 2.0.0
 */
export const getOrElse: {
  /**
   * Returns the wrapped value if it's a `Right` or a default value if is a `Left`.
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { Either } from "effect"
   *
   * assert.deepStrictEqual(Either.getOrElse(Either.right(1), (error) => error + "!"), 1)
   * assert.deepStrictEqual(Either.getOrElse(Either.left("not a number"), (error) => error + "!"), "not a number!")
   * ```
   *
   * @category getters
   * @since 2.0.0
   */
  <L, R2>(onLeft: (left: L) => R2): <R>(self: Either<R, L>) => R2 | R
  /**
   * Returns the wrapped value if it's a `Right` or a default value if is a `Left`.
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { Either } from "effect"
   *
   * assert.deepStrictEqual(Either.getOrElse(Either.right(1), (error) => error + "!"), 1)
   * assert.deepStrictEqual(Either.getOrElse(Either.left("not a number"), (error) => error + "!"), "not a number!")
   * ```
   *
   * @category getters
   * @since 2.0.0
   */
  <R, L, R2>(self: Either<R, L>, onLeft: (left: L) => R2): R | R2
} = dual(
  2,
  <R, L, B>(self: Either<R, L>, onLeft: (left: L) => B): R | B => isLeft(self) ? onLeft(self.left) : self.right
)

/**
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Either } from "effect"
 *
 * assert.deepStrictEqual(Either.getOrNull(Either.right(1)), 1)
 * assert.deepStrictEqual(Either.getOrNull(Either.left("a")), null)
 * ```
 *
 * @category getters
 * @since 2.0.0
 */
export const getOrNull: <R, L>(self: Either<R, L>) => R | null = getOrElse(constNull)

/**
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Either } from "effect"
 *
 * assert.deepStrictEqual(Either.getOrUndefined(Either.right(1)), 1)
 * assert.deepStrictEqual(Either.getOrUndefined(Either.left("a")), undefined)
 * ```
 *
 * @category getters
 * @since 2.0.0
 */
export const getOrUndefined: <R, L>(self: Either<R, L>) => R | undefined = getOrElse(constUndefined)

/**
 * Extracts the value of an `Either` or throws if the `Either` is `Left`.
 *
 * If a default error is sufficient for your use case and you don't need to configure the thrown error, see {@link getOrThrow}.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Either } from "effect"
 *
 * assert.deepStrictEqual(
 *   Either.getOrThrowWith(Either.right(1), () => new Error('Unexpected Left')),
 *   1
 * )
 * assert.throws(() => Either.getOrThrowWith(Either.left("error"), () => new Error('Unexpected Left')))
 * ```
 *
 * @category getters
 * @since 2.0.0
 */
export const getOrThrowWith: {
  /**
   * Extracts the value of an `Either` or throws if the `Either` is `Left`.
   *
   * If a default error is sufficient for your use case and you don't need to configure the thrown error, see {@link getOrThrow}.
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { Either } from "effect"
   *
   * assert.deepStrictEqual(
   *   Either.getOrThrowWith(Either.right(1), () => new Error('Unexpected Left')),
   *   1
   * )
   * assert.throws(() => Either.getOrThrowWith(Either.left("error"), () => new Error('Unexpected Left')))
   * ```
   *
   * @category getters
   * @since 2.0.0
   */
  <L>(onLeft: (left: L) => unknown): <A>(self: Either<A, L>) => A
  /**
   * Extracts the value of an `Either` or throws if the `Either` is `Left`.
   *
   * If a default error is sufficient for your use case and you don't need to configure the thrown error, see {@link getOrThrow}.
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { Either } from "effect"
   *
   * assert.deepStrictEqual(
   *   Either.getOrThrowWith(Either.right(1), () => new Error('Unexpected Left')),
   *   1
   * )
   * assert.throws(() => Either.getOrThrowWith(Either.left("error"), () => new Error('Unexpected Left')))
   * ```
   *
   * @category getters
   * @since 2.0.0
   */
  <R, L>(self: Either<R, L>, onLeft: (left: L) => unknown): R
} = dual(2, <R, L>(self: Either<R, L>, onLeft: (left: L) => unknown): R => {
  if (isRight(self)) {
    return self.right
  }
  throw onLeft(self.left)
})

// TODO(4.0): by default should throw `L` (i.e getOrThrowWith with the identity function)
/**
 * Extracts the value of an `Either` or throws if the `Either` is `Left`.
 *
 * The thrown error is a default error. To configure the error thrown, see  {@link getOrThrowWith}.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Either } from "effect"
 *
 * assert.deepStrictEqual(Either.getOrThrow(Either.right(1)), 1)
 * assert.throws(() => Either.getOrThrow(Either.left("error")))
 * ```
 *
 * @throws `Error("getOrThrow called on a Left")`
 *
 * @category getters
 * @since 2.0.0
 */
export const getOrThrow: <R, L>(self: Either<R, L>) => R = getOrThrowWith(() =>
  new Error("getOrThrow called on a Left")
)

/**
 * Returns `self` if it is a `Right` or `that` otherwise.
 *
 * @category error handling
 * @since 2.0.0
 */
export const orElse: {
  /**
   * Returns `self` if it is a `Right` or `that` otherwise.
   *
   * @category error handling
   * @since 2.0.0
   */
  <L, R2, L2>(that: (left: L) => Either<R2, L2>): <R>(self: Either<R, L>) => Either<R | R2, L2>
  /**
   * Returns `self` if it is a `Right` or `that` otherwise.
   *
   * @category error handling
   * @since 2.0.0
   */
  <R, L, R2, L2>(self: Either<R, L>, that: (left: L) => Either<R2, L2>): Either<R | R2, L2>
} = dual(
  2,
  <R1, L1, R2, L2>(self: Either<R1, L1>, that: (left: L1) => Either<R2, L2>): Either<R1 | R2, L2> =>
    isLeft(self) ? that(self.left) : right(self.right)
)

/**
 * @category sequencing
 * @since 2.0.0
 */
export const flatMap: {
  /**
   * @category sequencing
   * @since 2.0.0
   */
  <R, R2, L2>(f: (right: R) => Either<R2, L2>): <L>(self: Either<R, L>) => Either<R2, L | L2>
  /**
   * @category sequencing
   * @since 2.0.0
   */
  <R, L, R2, L2>(self: Either<R, L>, f: (right: R) => Either<R2, L2>): Either<R2, L | L2>
} = dual(
  2,
  <R1, L1, R2, L2>(self: Either<R1, L1>, f: (right: R1) => Either<R2, L2>): Either<R2, L1 | L2> =>
    isLeft(self) ? left(self.left) : f(self.right)
)

/**
 * Executes a sequence of two `Either`s. The second `Either` can be dependent on the result of the first `Either`.
 *
 * @category sequencing
 * @since 2.0.0
 */
export const andThen: {
  /**
   * Executes a sequence of two `Either`s. The second `Either` can be dependent on the result of the first `Either`.
   *
   * @category sequencing
   * @since 2.0.0
   */
  <R, R2, L2>(f: (right: R) => Either<R2, L2>): <L>(self: Either<R, L>) => Either<R2, L | L2>
  /**
   * Executes a sequence of two `Either`s. The second `Either` can be dependent on the result of the first `Either`.
   *
   * @category sequencing
   * @since 2.0.0
   */
  <R2, L2>(f: Either<R2, L2>): <L, R1>(self: Either<R1, L>) => Either<R2, L | L2>
  /**
   * Executes a sequence of two `Either`s. The second `Either` can be dependent on the result of the first `Either`.
   *
   * @category sequencing
   * @since 2.0.0
   */
  <R, R2>(f: (right: R) => R2): <L>(self: Either<R, L>) => Either<R2, L>
  /**
   * Executes a sequence of two `Either`s. The second `Either` can be dependent on the result of the first `Either`.
   *
   * @category sequencing
   * @since 2.0.0
   */
  <R2>(right: NotFunction<R2>): <R1, L>(self: Either<R1, L>) => Either<R2, L>
  /**
   * Executes a sequence of two `Either`s. The second `Either` can be dependent on the result of the first `Either`.
   *
   * @category sequencing
   * @since 2.0.0
   */
  <R, L, R2, L2>(self: Either<R, L>, f: (right: R) => Either<R2, L2>): Either<R2, L | L2>
  /**
   * Executes a sequence of two `Either`s. The second `Either` can be dependent on the result of the first `Either`.
   *
   * @category sequencing
   * @since 2.0.0
   */
  <R, L, R2, L2>(self: Either<R, L>, f: Either<R2, L2>): Either<R2, L | L2>
  /**
   * Executes a sequence of two `Either`s. The second `Either` can be dependent on the result of the first `Either`.
   *
   * @category sequencing
   * @since 2.0.0
   */
  <R, L, R2>(self: Either<R, L>, f: (right: R) => R2): Either<R2, L>
  /**
   * Executes a sequence of two `Either`s. The second `Either` can be dependent on the result of the first `Either`.
   *
   * @category sequencing
   * @since 2.0.0
   */
  <R, L, R2>(self: Either<R, L>, f: NotFunction<R2>): Either<R2, L>
} = dual(
  2,
  <R, L, R2, L2>(self: Either<R, L>, f: (right: R) => Either<R2, L2> | Either<R2, L2>): Either<R2, L | L2> =>
    flatMap(self, (a) => {
      const b = isFunction(f) ? f(a) : f
      return isEither(b) ? b : right(b)
    })
)

/**
 * @category zipping
 * @since 2.0.0
 */
export const zipWith: {
  /**
   * @category zipping
   * @since 2.0.0
   */
  <R2, L2, R, B>(that: Either<R2, L2>, f: (right: R, right2: R2) => B): <L>(self: Either<R, L>) => Either<B, L2 | L>
  /**
   * @category zipping
   * @since 2.0.0
   */
  <R, L, R2, L2, B>(self: Either<R, L>, that: Either<R2, L2>, f: (right: R, right2: R2) => B): Either<B, L | L2>
} = dual(
  3,
  <R, L, R2, L2, B>(self: Either<R, L>, that: Either<R2, L2>, f: (right: R, right2: R2) => B): Either<B, L | L2> =>
    flatMap(self, (r) => map(that, (r2) => f(r, r2)))
)

/**
 * @category combining
 * @since 2.0.0
 */
export const ap: {
  /**
   * @category combining
   * @since 2.0.0
   */
  <R, L2>(that: Either<R, L2>): <R2, L>(self: Either<(right: R) => R2, L>) => Either<R2, L | L2>
  /**
   * @category combining
   * @since 2.0.0
   */
  <R, R2, L, L2>(self: Either<(right: R) => R2, L>, that: Either<R, L2>): Either<R2, L | L2>
} = dual(
  2,
  <R, R2, L, L2>(self: Either<(right: R) => R2, L>, that: Either<R, L2>): Either<R2, L | L2> =>
    zipWith(self, that, (f, a) => f(a))
)

/**
 * Takes a structure of `Either`s and returns an `Either` of values with the same structure.
 *
 * - If a tuple is supplied, then the returned `Either` will contain a tuple with the same length.
 * - If a struct is supplied, then the returned `Either` will contain a struct with the same keys.
 * - If an iterable is supplied, then the returned `Either` will contain an array.
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Either } from "effect"
 *
 * assert.deepStrictEqual(Either.all([Either.right(1), Either.right(2)]), Either.right([1, 2]))
 * assert.deepStrictEqual(Either.all({ right: Either.right(1), b: Either.right("hello") }), Either.right({ right: 1, b: "hello" }))
 * assert.deepStrictEqual(Either.all({ right: Either.right(1), b: Either.left("error") }), Either.left("error"))
 * ```
 *
 * @category combining
 * @since 2.0.0
 */
// @ts-expect-error
export const all: <const I extends Iterable<Either<any, any>> | Record<string, Either<any, any>>>(
  input: I
) => [I] extends [ReadonlyArray<Either<any, any>>] ? Either<
    { -readonly [K in keyof I]: [I[K]] extends [Either<infer R, any>] ? R : never },
    I[number] extends never ? never : [I[number]] extends [Either<any, infer L>] ? L : never
  >
  : [I] extends [Iterable<Either<infer R, infer L>>] ? Either<Array<R>, L>
  : Either<
    { -readonly [K in keyof I]: [I[K]] extends [Either<infer R, any>] ? R : never },
    I[keyof I] extends never ? never : [I[keyof I]] extends [Either<any, infer L>] ? L : never
  > = (
    input: Iterable<Either<any, any>> | Record<string, Either<any, any>>
  ): Either<any, any> => {
    if (Symbol.iterator in input) {
      const out: Array<Either<any, any>> = []
      for (const e of input) {
        if (isLeft(e)) {
          return e
        }
        out.push(e.right)
      }
      return right(out)
    }

    const out: Record<string, any> = {}
    for (const key of Object.keys(input)) {
      const e = input[key]
      if (isLeft(e)) {
        return e
      }
      out[key] = e.right
    }
    return right(out)
  }

/**
 * Returns an `Either` that swaps the error/success cases. This allows you to
 * use all methods on the error channel, possibly before flipping back.
 *
 * @since 2.0.0
 * @category mapping
 */
export const flip = <R, L>(self: Either<R, L>): Either<L, R> => isLeft(self) ? right(self.left) : left(self.right)

const adapter = Gen.adapter<EitherTypeLambda>()

/**
 * @category generators
 * @since 2.0.0
 */
export const gen: Gen.Gen<EitherTypeLambda, Gen.Adapter<EitherTypeLambda>> = (...args) => {
  const f = args.length === 1 ? args[0] : args[1].bind(args[0])
  const iterator = f(adapter)
  let state: IteratorResult<any> = iterator.next()
  while (!state.done) {
    const current = Gen.isGenKind(state.value)
      ? state.value.value
      : Gen.yieldWrapGet(state.value)
    if (isLeft(current)) {
      return current
    }
    state = iterator.next(current.right as never)
  }
  return right(state.value) as any
}

// -------------------------------------------------------------------------------------
// do notation
// -------------------------------------------------------------------------------------

/**
 * The "do simulation" in Effect allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
 *
 * Here's how the do simulation works:
 *
 * 1. Start the do simulation using the `Do` value
 * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Either` values
 * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
 * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Either, pipe } from "effect"
 *
 * const result = pipe(
 *   Either.Do,
 *   Either.bind("x", () => Either.right(2)),
 *   Either.bind("y", () => Either.right(3)),
 *   Either.let("sum", ({ x, y }) => x + y)
 * )
 * assert.deepStrictEqual(result, Either.right({ x: 2, y: 3, sum: 5 }))
 * ```
 *
 * @see {@link bind}
 * @see {@link bindTo}
 * @see {@link let_ let}
 *
 * @category do notation
 * @since 2.0.0
 */
export const Do: Either<{}> = right({})

/**
 * The "do simulation" in Effect allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
 *
 * Here's how the do simulation works:
 *
 * 1. Start the do simulation using the `Do` value
 * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Either` values
 * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
 * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Either, pipe } from "effect"
 *
 * const result = pipe(
 *   Either.Do,
 *   Either.bind("x", () => Either.right(2)),
 *   Either.bind("y", () => Either.right(3)),
 *   Either.let("sum", ({ x, y }) => x + y)
 * )
 * assert.deepStrictEqual(result, Either.right({ x: 2, y: 3, sum: 5 }))
 * ```
 *
 * @see {@link Do}
 * @see {@link bindTo}
 * @see {@link let_ let}
 *
 * @category do notation
 * @since 2.0.0
 */
export const bind: {
  /**
   * The "do simulation" in Effect allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
   *
   * Here's how the do simulation works:
   *
   * 1. Start the do simulation using the `Do` value
   * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Either` values
   * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
   * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { Either, pipe } from "effect"
   *
   * const result = pipe(
   *   Either.Do,
   *   Either.bind("x", () => Either.right(2)),
   *   Either.bind("y", () => Either.right(3)),
   *   Either.let("sum", ({ x, y }) => x + y)
   * )
   * assert.deepStrictEqual(result, Either.right({ x: 2, y: 3, sum: 5 }))
   * ```
   *
   * @see {@link Do}
   * @see {@link bindTo}
   * @see {@link let_ let}
   *
   * @category do notation
   * @since 2.0.0
   */
  <N extends string, A extends object, B, L2>(name: Exclude<N, keyof A>, f: (a: NoInfer<A>) => Either<B, L2>): <L1>(self: Either<A, L1>) => Either<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, L1 | L2>
  /**
   * The "do simulation" in Effect allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
   *
   * Here's how the do simulation works:
   *
   * 1. Start the do simulation using the `Do` value
   * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Either` values
   * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
   * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { Either, pipe } from "effect"
   *
   * const result = pipe(
   *   Either.Do,
   *   Either.bind("x", () => Either.right(2)),
   *   Either.bind("y", () => Either.right(3)),
   *   Either.let("sum", ({ x, y }) => x + y)
   * )
   * assert.deepStrictEqual(result, Either.right({ x: 2, y: 3, sum: 5 }))
   * ```
   *
   * @see {@link Do}
   * @see {@link bindTo}
   * @see {@link let_ let}
   *
   * @category do notation
   * @since 2.0.0
   */
  <A extends object, L1, N extends string, B, L2>(
    self: Either<A, L1>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Either<B, L2>
  ): Either<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, L1 | L2>
} = doNotation.bind<EitherTypeLambda>(map, flatMap)

/**
 * The "do simulation" in Effect allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
 *
 * Here's how the do simulation works:
 *
 * 1. Start the do simulation using the `Do` value
 * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Either` values
 * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
 * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
 *
 * @example
 * ```ts
 * import * as assert from "node:assert"
 * import { Either, pipe } from "effect"
 *
 * const result = pipe(
 *   Either.Do,
 *   Either.bind("x", () => Either.right(2)),
 *   Either.bind("y", () => Either.right(3)),
 *   Either.let("sum", ({ x, y }) => x + y)
 * )
 * assert.deepStrictEqual(result, Either.right({ x: 2, y: 3, sum: 5 }))
 * ```
 *
 * @see {@link Do}
 * @see {@link bind}
 * @see {@link let_ let}
 *
 * @category do notation
 * @since 2.0.0
 */
export const bindTo: {
  /**
   * The "do simulation" in Effect allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
   *
   * Here's how the do simulation works:
   *
   * 1. Start the do simulation using the `Do` value
   * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Either` values
   * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
   * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { Either, pipe } from "effect"
   *
   * const result = pipe(
   *   Either.Do,
   *   Either.bind("x", () => Either.right(2)),
   *   Either.bind("y", () => Either.right(3)),
   *   Either.let("sum", ({ x, y }) => x + y)
   * )
   * assert.deepStrictEqual(result, Either.right({ x: 2, y: 3, sum: 5 }))
   * ```
   *
   * @see {@link Do}
   * @see {@link bind}
   * @see {@link let_ let}
   *
   * @category do notation
   * @since 2.0.0
   */
  <N extends string>(name: N): <R, L>(self: Either<R, L>) => Either<{ [K in N]: R }, L>
  /**
   * The "do simulation" in Effect allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
   *
   * Here's how the do simulation works:
   *
   * 1. Start the do simulation using the `Do` value
   * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Either` values
   * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
   * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { Either, pipe } from "effect"
   *
   * const result = pipe(
   *   Either.Do,
   *   Either.bind("x", () => Either.right(2)),
   *   Either.bind("y", () => Either.right(3)),
   *   Either.let("sum", ({ x, y }) => x + y)
   * )
   * assert.deepStrictEqual(result, Either.right({ x: 2, y: 3, sum: 5 }))
   * ```
   *
   * @see {@link Do}
   * @see {@link bind}
   * @see {@link let_ let}
   *
   * @category do notation
   * @since 2.0.0
   */
  <R, L, N extends string>(self: Either<R, L>, name: N): Either<{ [K in N]: R }, L>
} = doNotation.bindTo<EitherTypeLambda>(map)

const let_: {
  <N extends string, R extends object, B>(
    name: Exclude<N, keyof R>,
    f: (r: NoInfer<R>) => B
  ): <L>(self: Either<R, L>) => Either<{ [K in N | keyof R]: K extends keyof R ? R[K] : B }, L>
  <R extends object, L, N extends string, B>(
    self: Either<R, L>,
    name: Exclude<N, keyof R>,
    f: (r: NoInfer<R>) => B
  ): Either<{ [K in N | keyof R]: K extends keyof R ? R[K] : B }, L>
} = doNotation.let_<EitherTypeLambda>(map)

export {
  /**
   * The "do simulation" in Effect allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
   *
   * Here's how the do simulation works:
   *
   * 1. Start the do simulation using the `Do` value
   * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Either` values
   * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
   * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
   *
   * @example
   * ```ts
   * import * as assert from "node:assert"
   * import { Either, pipe } from "effect"
   *
   * const result = pipe(
   *   Either.Do,
   *   Either.bind("x", () => Either.right(2)),
   *   Either.bind("y", () => Either.right(3)),
   *   Either.let("sum", ({ x, y }) => x + y)
   * )
   * assert.deepStrictEqual(result, Either.right({ x: 2, y: 3, sum: 5 }))
   * ```
   *
   * @see {@link Do}
   * @see {@link bindTo}
   * @see {@link bind}
   *
   * @category do notation
   * @since 2.0.0
   */
  let_ as let
}

/**
 * Converts an `Option` of an `Either` into an `Either` of an `Option`.
 *
 * **Details**
 *
 * This function transforms an `Option<Either<A, E>>` into an
 * `Either<Option<A>, E>`. If the `Option` is `None`, the resulting `Either`
 * will be a `Right` with a `None` value. If the `Option` is `Some`, the
 * inner `Either` will be executed, and its result wrapped in a `Some`.
 *
 * @example
 * ```ts
 * import { Effect, Either, Option } from "effect"
 *
 * //      ┌─── Option<Either<number, never>>
 * //      ▼
 * const maybe = Option.some(Either.right(42))
 *
 * //      ┌─── Either<Option<number>, never, never>
 * //      ▼
 * const result = Either.transposeOption(maybe)
 *
 * console.log(Effect.runSync(result))
 * // Output: { _id: 'Option', _tag: 'Some', value: 42 }
 * ```
 *
 * @since 3.14.0
 * @category Optional Wrapping & Unwrapping
 */
export const transposeOption = <A = never, E = never>(
  self: Option<Either<A, E>>
): Either<Option<A>, E> => {
  return option_.isNone(self) ? right(option_.none) : map(self.value, option_.some)
}

/**
 * Applies an `Either` on an `Option` and transposes the result.
 *
 * **Details**
 *
 * If the `Option` is `None`, the resulting `Either` will immediately succeed with a `Right` value of `None`.
 * If the `Option` is `Some`, the transformation function will be applied to the inner value, and its result wrapped in a `Some`.
 *
 * @example
 * ```ts
 * import { Either, Option, pipe } from "effect"
 *
 * //          ┌─── Either<Option<number>, never>>
 * //          ▼
 * const noneResult = pipe(
 *   Option.none(),
 *   Either.transposeMapOption(() => Either.right(42)) // will not be executed
 * )
 * console.log(noneResult)
 * // Output: { _id: 'Either', _tag: 'Right', right: { _id: 'Option', _tag: 'None' } }
 *
 * //          ┌─── Either<Option<number>, never>>
 * //          ▼
 * const someRightResult = pipe(
 *   Option.some(42),
 *   Either.transposeMapOption((value) => Either.right(value * 2))
 * )
 * console.log(someRightResult)
 * // Output: { _id: 'Either', _tag: 'Right', right: { _id: 'Option', _tag: 'Some', value: 84 } }
 * ```
 *
 * @since 3.15.0
 * @category Optional Wrapping & Unwrapping
 */
export const transposeMapOption = dual<
  /**
   * Applies an `Either` on an `Option` and transposes the result.
   *
   * **Details**
   *
   * If the `Option` is `None`, the resulting `Either` will immediately succeed with a `Right` value of `None`.
   * If the `Option` is `Some`, the transformation function will be applied to the inner value, and its result wrapped in a `Some`.
   *
   * @example
   * ```ts
   * import { Either, Option, pipe } from "effect"
   *
   * //          ┌─── Either<Option<number>, never>>
   * //          ▼
   * const noneResult = pipe(
   *   Option.none(),
   *   Either.transposeMapOption(() => Either.right(42)) // will not be executed
   * )
   * console.log(noneResult)
   * // Output: { _id: 'Either', _tag: 'Right', right: { _id: 'Option', _tag: 'None' } }
   *
   * //          ┌─── Either<Option<number>, never>>
   * //          ▼
   * const someRightResult = pipe(
   *   Option.some(42),
   *   Either.transposeMapOption((value) => Either.right(value * 2))
   * )
   * console.log(someRightResult)
   * // Output: { _id: 'Either', _tag: 'Right', right: { _id: 'Option', _tag: 'Some', value: 84 } }
   * ```
   *
   * @since 3.15.0
   * @category Optional Wrapping & Unwrapping
   */
  <A, B, E = never>(f: (self: A) => Either<B, E>) => (self: Option<A>) => Either<Option<B>, E>,
  /**
   * Applies an `Either` on an `Option` and transposes the result.
   *
   * **Details**
   *
   * If the `Option` is `None`, the resulting `Either` will immediately succeed with a `Right` value of `None`.
   * If the `Option` is `Some`, the transformation function will be applied to the inner value, and its result wrapped in a `Some`.
   *
   * @example
   * ```ts
   * import { Either, Option, pipe } from "effect"
   *
   * //          ┌─── Either<Option<number>, never>>
   * //          ▼
   * const noneResult = pipe(
   *   Option.none(),
   *   Either.transposeMapOption(() => Either.right(42)) // will not be executed
   * )
   * console.log(noneResult)
   * // Output: { _id: 'Either', _tag: 'Right', right: { _id: 'Option', _tag: 'None' } }
   *
   * //          ┌─── Either<Option<number>, never>>
   * //          ▼
   * const someRightResult = pipe(
   *   Option.some(42),
   *   Either.transposeMapOption((value) => Either.right(value * 2))
   * )
   * console.log(someRightResult)
   * // Output: { _id: 'Either', _tag: 'Right', right: { _id: 'Option', _tag: 'Some', value: 84 } }
   * ```
   *
   * @since 3.15.0
   * @category Optional Wrapping & Unwrapping
   */
  <A, B, E = never>(self: Option<A>, f: (self: A) => Either<B, E>) => Either<Option<B>, E>
>(2, (self, f) => option_.isNone(self) ? right(option_.none) : map(f(self.value), option_.some))
