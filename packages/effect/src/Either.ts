/**
 * @since 2.0.0
 */

import * as Equivalence from "./Equivalence.js"
import type { LazyArg } from "./Function.js"
import { constNull, constUndefined, dual, identity } from "./Function.js"
import type { TypeLambda } from "./HKT.js"
import type { Inspectable } from "./Inspectable.js"
import * as either from "./internal/either.js"
import type { Option } from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type { Predicate, Refinement } from "./Predicate.js"
import { isFunction } from "./Predicate.js"
import type { Covariant, MergeRecord, NoInfer, NotFunction } from "./Types.js"
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
 * import * as Either from 'effect/Either'
 *
 * assert.deepStrictEqual(Either.fromNullable(1, () => 'fallback'), Either.right(1))
 * assert.deepStrictEqual(Either.fromNullable(null, () => 'fallback'), Either.left('fallback'))
 *
 * @category constructors
 * @since 2.0.0
 */
export const fromNullable: {
  <R, L>(onNullable: (right: R) => L): (self: R) => Either<NonNullable<R>, L>
  <R, L>(self: R, onNullable: (right: R) => L): Either<NonNullable<R>, L>
} = dual(
  2,
  <R, L>(self: R, onNullable: (right: R) => L): Either<NonNullable<R>, L> =>
    self == null ? left(onNullable(self)) : right(self as NonNullable<R>)
)

/**
 * @example
 * import * as Either from 'effect/Either'
 * import * as Option from 'effect/Option'
 *
 * assert.deepStrictEqual(Either.fromOption(Option.some(1), () => 'error'), Either.right(1))
 * assert.deepStrictEqual(Either.fromOption(Option.none(), () => 'error'), Either.left('error'))
 *
 * @category constructors
 * @since 2.0.0
 */
export const fromOption: {
  <L>(onNone: () => L): <R>(self: Option<R>) => Either<R, L>
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
 * @param input - The value to test.
 *
 * @example
 * import { isEither, left, right } from 'effect/Either'
 *
 * assert.deepStrictEqual(isEither(right(1)), true)
 * assert.deepStrictEqual(isEither(left("a")), true)
 * assert.deepStrictEqual(isEither({ right: 1 }), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isEither: (input: unknown) => input is Either<unknown, unknown> = either.isEither

/**
 * Determine if a `Either` is a `Left`.
 *
 * @param self - The `Either` to check.
 *
 * @example
 * import { isLeft, left, right } from 'effect/Either'
 *
 * assert.deepStrictEqual(isLeft(right(1)), false)
 * assert.deepStrictEqual(isLeft(left("a")), true)
 *
 * @category guards
 * @since 2.0.0
 */
export const isLeft: <R, L>(self: Either<R, L>) => self is Left<L, R> = either.isLeft

/**
 * Determine if a `Either` is a `Right`.
 *
 * @param self - The `Either` to check.
 *
 * @example
 * import { isRight, left, right } from 'effect/Either'
 *
 * assert.deepStrictEqual(isRight(right(1)), true)
 * assert.deepStrictEqual(isRight(left("a")), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isRight: <R, L>(self: Either<R, L>) => self is Right<L, R> = either.isRight

/**
 * Converts a `Either` to an `Option` discarding the `Left`.
 *
 * Alias of {@link toOption}.
 *
 * @example
 * import * as O from 'effect/Option'
 * import * as E from 'effect/Either'
 *
 * assert.deepStrictEqual(E.getRight(E.right('ok')), O.some('ok'))
 * assert.deepStrictEqual(E.getRight(E.left('err')), O.none())
 *
 * @category getters
 * @since 2.0.0
 */
export const getRight: <R, L>(self: Either<R, L>) => Option<R> = either.getRight

/**
 * Converts a `Either` to an `Option` discarding the value.
 *
 * @example
 * import * as O from 'effect/Option'
 * import * as E from 'effect/Either'
 *
 * assert.deepStrictEqual(E.getLeft(E.right('ok')), O.none())
 * assert.deepStrictEqual(E.getLeft(E.left('err')), O.some('err'))
 *
 * @category getters
 * @since 2.0.0
 */
export const getLeft: <R, L>(self: Either<R, L>) => Option<L> = either.getLeft

/**
 * @category equivalence
 * @since 2.0.0
 */
export const getEquivalence = <R, L>(
  EquivalenceL: Equivalence.Equivalence<L>,
  EquivalenceR: Equivalence.Equivalence<R>
): Equivalence.Equivalence<Either<R, L>> =>
  Equivalence.make((x, y) =>
    x === y ||
    (isLeft(x) ?
      isLeft(y) && EquivalenceL(x.left, y.left) :
      isRight(y) && EquivalenceR(x.right, y.right))
  )

/**
 * @category mapping
 * @since 2.0.0
 */
export const mapBoth: {
  <L, L2, R, R2>(options: {
    readonly onLeft: (left: L) => L2
    readonly onRight: (right: R) => R2
  }): (self: Either<R, L>) => Either<R2, L2>
  <L, R, L2, R2>(self: Either<R, L>, options: {
    readonly onLeft: (left: L) => L2
    readonly onRight: (right: R) => R2
  }): Either<R2, L2>
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
 * @param self - The input `Either` value to map.
 * @param f - A transformation function to apply to the `Left` value of the input `Either`.
 *
 * @category mapping
 * @since 2.0.0
 */
export const mapLeft: {
  <L, L2>(f: (left: L) => L2): <R>(self: Either<R, L>) => Either<R, L2>
  <R, L, L2>(self: Either<R, L>, f: (left: L) => L2): Either<R, L2>
} = dual(
  2,
  <R, L1, L2>(self: Either<R, L1>, f: (left: L1) => L2): Either<R, L2> =>
    isLeft(self) ? left(f(self.left)) : right(self.right)
)

/**
 * Maps the `Right` side of an `Either` value to a new `Either` value.
 *
 * @param self - An `Either` to map
 * @param f - The function to map over the value of the `Either`
 *
 * @category mapping
 * @since 2.0.0
 */
export const map: {
  <R, R2>(f: (right: R) => R2): <L>(self: Either<R, L>) => Either<R2, L>
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
 * import * as E from 'effect/Either'
 * import { pipe } from 'effect/Function'
 *
 * const onLeft  = (strings: ReadonlyArray<string>): string => `strings: ${strings.join(', ')}`
 *
 * const onRight = (value: number): string => `Ok: ${value}`
 *
 * assert.deepStrictEqual(pipe(E.right(1), E.match({ onLeft, onRight })), 'Ok: 1')
 * assert.deepStrictEqual(
 *   pipe(E.left(['string 1', 'string 2']), E.match({ onLeft, onRight })),
 *   'strings: string 1, string 2'
 * )
 *
 * @category pattern matching
 * @since 2.0.0
 */
export const match: {
  <L, B, R, C = B>(options: {
    readonly onLeft: (left: L) => B
    readonly onRight: (right: R) => C
  }): (self: Either<R, L>) => B | C
  <R, L, B, C = B>(self: Either<R, L>, options: {
    readonly onLeft: (left: L) => B
    readonly onRight: (right: R) => C
  }): B | C
} = dual(
  2,
  <R, L, B, C = B>(self: Either<R, L>, { onLeft, onRight }: {
    readonly onLeft: (left: L) => B
    readonly onRight: (right: R) => C
  }): B | C => isLeft(self) ? onLeft(self.left) : onRight(self.right)
)

/**
 * Filter the right value with the provided function.
 * If the predicate fails, set the left value with the result of the provided function.
 *
 * @example
 * import * as E from 'effect/Either'
 * import { pipe } from 'effect/Function'
 *
 * const isPositive = (n: number): boolean => n > 0
 *
 * assert.deepStrictEqual(
 *   pipe(
 *     E.right(1),
 *     E.filterOrLeft(isPositive, n => `${n} is not positive`)
 *   ),
 *   E.right(1)
 * )
 * assert.deepStrictEqual(
 *   pipe(
 *     E.right(0),
 *     E.filterOrLeft(isPositive, n => `${n} is not positive`)
 *   ),
 *   E.left("0 is not positive")
 * )
 *
 * @since 2.0.0
 * @category filtering & conditionals
 */
export const filterOrLeft: {
  <R, B extends R, L2>(
    refinement: Refinement<NoInfer<R>, B>,
    orLeftWith: (right: NoInfer<R>) => L2
  ): <L>(self: Either<R, L>) => Either<B, L2 | L>
  <R, L2>(
    predicate: Predicate<NoInfer<R>>,
    orLeftWith: (right: NoInfer<R>) => L2
  ): <L>(self: Either<R, L>) => Either<R, L2 | L>
  <R, L, B extends R, L2>(
    self: Either<R, L>,
    refinement: Refinement<R, B>,
    orLeftWith: (right: R) => L2
  ): Either<B, L | L2>
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
 * import * as Either from 'effect/Either'
 *
 * assert.deepStrictEqual(Either.getOrElse(Either.right(1), (error) => error + "!"), 1)
 * assert.deepStrictEqual(Either.getOrElse(Either.left("not a number"), (error) => error + "!"), "not a number!")
 *
 * @category getters
 * @since 2.0.0
 */
export const getOrElse: {
  <L, R2>(onLeft: (left: L) => R2): <R>(self: Either<R, L>) => R2 | R
  <R, L, R2>(self: Either<R, L>, onLeft: (left: L) => R2): R | R2
} = dual(
  2,
  <R, L, B>(self: Either<R, L>, onLeft: (left: L) => B): R | B => isLeft(self) ? onLeft(self.left) : self.right
)

/**
 * @example
 * import * as Either from 'effect/Either'
 *
 * assert.deepStrictEqual(Either.getOrNull(Either.right(1)), 1)
 * assert.deepStrictEqual(Either.getOrNull(Either.left("a")), null)
 *
 * @category getters
 * @since 2.0.0
 */
export const getOrNull: <R, L>(self: Either<R, L>) => R | null = getOrElse(constNull)

/**
 * @example
 * import * as Either from 'effect/Either'
 *
 * assert.deepStrictEqual(Either.getOrUndefined(Either.right(1)), 1)
 * assert.deepStrictEqual(Either.getOrUndefined(Either.left("a")), undefined)
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
 * @param self - The `Either` to extract the value from.
 * @param onLeft - A function that will be called if the `Either` is `Left`. It returns the error to be thrown.
 *
 * @example
 * import * as E from "effect/Either"
 *
 * assert.deepStrictEqual(
 *   E.getOrThrowWith(E.right(1), () => new Error('Unexpected Left')),
 *   1
 * )
 * assert.throws(() => E.getOrThrowWith(E.left("error"), () => new Error('Unexpected Left')))
 *
 * @category getters
 * @since 2.0.0
 */
export const getOrThrowWith: {
  <L>(onLeft: (left: L) => unknown): <A>(self: Either<A, L>) => A
  <R, L>(self: Either<R, L>, onLeft: (left: L) => unknown): R
} = dual(2, <R, L>(self: Either<R, L>, onLeft: (left: L) => unknown): R => {
  if (isRight(self)) {
    return self.right
  }
  throw onLeft(self.left)
})

/**
 * Extracts the value of an `Either` or throws if the `Either` is `Left`.
 *
 * The thrown error is a default error. To configure the error thrown, see  {@link getOrThrowWith}.
 *
 * @param self - The `Either` to extract the value from.
 * @throws `Error("getOrThrow called on a Left")`
 *
 * @example
 * import * as E from "effect/Either"
 *
 * assert.deepStrictEqual(E.getOrThrow(E.right(1)), 1)
 * assert.throws(() => E.getOrThrow(E.left("error")))
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
 * @param self - The input `Either` value to check and potentially return.
 * @param that - A function that takes the error value from `self` (if it's a `Left`) and returns a new `Either` value.
 *
 * @category error handling
 * @since 2.0.0
 */
export const orElse: {
  <L, R2, L2>(that: (left: L) => Either<R2, L2>): <R>(self: Either<R, L>) => Either<R | R2, L2>
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
  <R, R2, L2>(f: (right: R) => Either<R2, L2>): <L>(self: Either<R, L>) => Either<R2, L | L2>
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
  <R, R2, L2>(f: (right: R) => Either<R2, L2>): <L>(self: Either<R, L>) => Either<R2, L | L2>
  <R2, L2>(f: Either<R2, L2>): <L, R1>(self: Either<R1, L>) => Either<R2, L | L2>
  <R, R2>(f: (right: R) => R2): <L>(self: Either<R, L>) => Either<R2, L>
  <R2>(right: NotFunction<R2>): <R1, L>(self: Either<R1, L>) => Either<R2, L>
  <R, L, R2, L2>(self: Either<R, L>, f: (right: R) => Either<R2, L2>): Either<R2, L | L2>
  <R, L, R2, L2>(self: Either<R, L>, f: Either<R2, L2>): Either<R2, L | L2>
  <R, L, R2>(self: Either<R, L>, f: (right: R) => R2): Either<R2, L>
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
  <R2, L2, R, B>(
    that: Either<R2, L2>,
    f: (right: R, right2: R2) => B
  ): <L>(self: Either<R, L>) => Either<B, L2 | L>
  <R, L, R2, L2, B>(
    self: Either<R, L>,
    that: Either<R2, L2>,
    f: (right: R, right2: R2) => B
  ): Either<B, L | L2>
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
  <R, L2>(that: Either<R, L2>): <R2, L>(self: Either<(right: R) => R2, L>) => Either<R2, L | L2>
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
 * @param fields - the struct of `Either`s to be sequenced.
 *
 * @example
 * import * as Either from "effect/Either"
 *
 * assert.deepStrictEqual(Either.all([Either.right(1), Either.right(2)]), Either.right([1, 2]))
 * assert.deepStrictEqual(Either.all({ right: Either.right(1), b: Either.right("hello") }), Either.right({ right: 1, b: "hello" }))
 * assert.deepStrictEqual(Either.all({ right: Either.right(1), b: Either.left("error") }), Either.left("error"))
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
      for (const e of (input as Iterable<Either<any, any>>)) {
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
export const gen: Gen.Gen<EitherTypeLambda, Gen.Adapter<EitherTypeLambda>> = (f) => {
  const iterator = f(adapter)
  let state: IteratorYieldResult<any> | IteratorReturnResult<any> = iterator.next()
  if (state.done) {
    return right(state.value) as any
  } else {
    let current = state.value.value
    if (isLeft(current)) {
      return current
    }
    while (!state.done) {
      state = iterator.next(current.right)
      if (!state.done) {
        current = state.value.value
        if (isLeft(current)) {
          return current
        }
      }
    }
    return right(state.value)
  }
}

// -------------------------------------------------------------------------------------
// do notation
// -------------------------------------------------------------------------------------

/**
 * @since 2.4.0
 * @category do notation
 */
export const Do: Either<{}> = right({})

/**
 * Binds an effectful value in a `do` scope
 *
 * @since 2.4.0
 * @category do notation
 */
export const bind: {
  <N extends string, K, A, E2>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => Either<A, E2>
  ): <E>(self: Either<K, E>) => Either<MergeRecord<K, { [k in N]: A }>, E2 | E>
  <K, E, N extends string, A, E2>(
    self: Either<E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => Either<A, E2>
  ): Either<MergeRecord<K, { [k in N]: A }>, E2 | E>
} = dual(3, <K, E, N extends string, A, E2>(
  self: Either<K, E>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => Either<A, E2>
): Either<MergeRecord<K, { [k in N]: A }>, E2 | E> =>
  flatMap(self, (k) =>
    map(
      f(k),
      (a): MergeRecord<K, { [k in N]: A }> => ({ ...k, [tag]: a } as any)
    )))

/**
 * @category do notation
 * @since 2.4.0
 */
export const bindTo: {
  <N extends string>(tag: N): <A, E>(self: Either<A, E>) => Either<Record<N, A>, E>
  <A, E, N extends string>(self: Either<A, E>, tag: N): Either<Record<N, A>, E>
} = dual(
  2,
  <A, E, N extends string>(self: Either<A, E>, tag: N): Either<Record<N, A>, E> =>
    map(self, (a) => ({ [tag]: a } as Record<N, A>))
)

const let_: {
  <N extends string, K, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ): <E>(self: Either<K, E>) => Either<MergeRecord<K, { [k in N]: A }>, E>
  <K, E, N extends string, A>(
    self: Either<K, E>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ): Either<MergeRecord<K, { [k in N]: A }>, E>
} = dual(3, <K, E, N extends string, A>(
  self: Either<K, E>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => A
): Either<MergeRecord<K, { [k in N]: A }>, E> =>
  map(
    self,
    (k): MergeRecord<K, { [k in N]: A }> => ({ ...k, [tag]: f(k) } as any)
  ))

export {
  /**
   * Like bind for values
   *
   * @since 2.4.0
   * @category do notation
   */
  let_ as let
}
