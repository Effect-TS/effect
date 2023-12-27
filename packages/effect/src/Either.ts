/**
 * @since 2.0.0
 */

import type * as Data from "./Data.js"
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
import type * as Types from "./Types.js"
import type * as Unify from "./Unify.js"
import * as Gen from "./Utils.js"

/**
 * @category models
 * @since 2.0.0
 */
export type Either<E, A> = Left<E, A> | Right<E, A>

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
export interface Left<out E, out A> extends Data.Case, Pipeable, Inspectable {
  readonly _tag: "Left"
  readonly _op: "Left"
  readonly left: E
  readonly [TypeId]: {
    readonly _A: Types.Covariant<A>
    readonly _E: Types.Covariant<E>
  }
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: EitherUnify<this>
  [Unify.ignoreSymbol]?: EitherUnifyIgnore
}

/**
 * @category models
 * @since 2.0.0
 */
export interface Right<out E, out A> extends Data.Case, Pipeable, Inspectable {
  readonly _tag: "Right"
  readonly _op: "Right"
  readonly right: A
  readonly [TypeId]: {
    readonly _A: Types.Covariant<A>
    readonly _E: Types.Covariant<E>
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
  Either?: () => A[Unify.typeSymbol] extends Either<infer E0, infer A0> | infer _ ? Either<E0, A0> : never
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
  readonly type: Either<this["Out1"], this["Target"]>
}

/**
 * Constructs a new `Either` holding a `Right` value. This usually represents a successful value due to the right bias
 * of this structure.
 *
 * @category constructors
 * @since 2.0.0
 */
export const right: <A>(a: A) => Either<never, A> = either.right

/**
 * Constructs a new `Either` holding a `Left` value. This usually represents a failure, due to the right-bias of this
 * structure.
 *
 * @category constructors
 * @since 2.0.0
 */
export const left: <E>(e: E) => Either<E, never> = either.left

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
  <A, E>(onNullable: (a: A) => E): (self: A) => Either<E, NonNullable<A>>
  <A, E>(self: A, onNullable: (a: A) => E): Either<E, NonNullable<A>>
} = dual(
  2,
  <A, E>(self: A, onNullable: (a: A) => E): Either<E, NonNullable<A>> =>
    self == null ? left(onNullable(self)) : right(self as NonNullable<A>)
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
  <A, E>(self: Option<A>, onNone: () => E): Either<E, A>
  <E>(onNone: () => E): <A>(self: Option<A>) => Either<E, A>
} = either.fromOption

const try_: {
  <A, E>(
    options: {
      readonly try: LazyArg<A>
      readonly catch: (error: unknown) => E
    }
  ): Either<E, A>
  <A>(evaluate: LazyArg<A>): Either<unknown, A>
} = (<A, E>(
  evaluate: LazyArg<A> | {
    readonly try: LazyArg<A>
    readonly catch: (error: unknown) => E
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
export const isLeft: <E, A>(self: Either<E, A>) => self is Left<E, A> = either.isLeft

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
export const isRight: <E, A>(self: Either<E, A>) => self is Right<E, A> = either.isRight

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
export const getRight: <E, A>(self: Either<E, A>) => Option<A> = either.getRight

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
export const getLeft: <E, A>(self: Either<E, A>) => Option<E> = either.getLeft

/**
 * @category equivalence
 * @since 2.0.0
 */
export const getEquivalence = <E, A>(
  EE: Equivalence.Equivalence<E>,
  EA: Equivalence.Equivalence<A>
): Equivalence.Equivalence<Either<E, A>> =>
  Equivalence.make((x, y) =>
    x === y ||
    (isLeft(x) ?
      isLeft(y) && EE(x.left, y.left) :
      isRight(y) && EA(x.right, y.right))
  )

/**
 * @category mapping
 * @since 2.0.0
 */
export const mapBoth: {
  <E1, E2, A, B>(options: {
    readonly onLeft: (e: E1) => E2
    readonly onRight: (a: A) => B
  }): (self: Either<E1, A>) => Either<E2, B>
  <E1, A, E2, B>(self: Either<E1, A>, options: {
    readonly onLeft: (e: E1) => E2
    readonly onRight: (a: A) => B
  }): Either<E2, B>
} = dual(
  2,
  <E1, A, E2, B>(self: Either<E1, A>, { onLeft, onRight }: {
    readonly onLeft: (e: E1) => E2
    readonly onRight: (a: A) => B
  }): Either<E2, B> => isLeft(self) ? left(onLeft(self.left)) : right(onRight(self.right))
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
  <E, G>(f: (e: E) => G): <A>(self: Either<E, A>) => Either<G, A>
  <E, A, G>(self: Either<E, A>, f: (e: E) => G): Either<G, A>
} = dual(
  2,
  <E, A, G>(self: Either<E, A>, f: (e: E) => G): Either<G, A> => isLeft(self) ? left(f(self.left)) : right(self.right)
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
  <A, B>(f: (a: A) => B): <E>(self: Either<E, A>) => Either<E, B>
  <E, A, B>(self: Either<E, A>, f: (a: A) => B): Either<E, B>
} = dual(
  2,
  <E, A, B>(self: Either<E, A>, f: (a: A) => B): Either<E, B> => isRight(self) ? right(f(self.right)) : left(self.left)
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
  <E, B, A, C = B>(options: {
    readonly onLeft: (e: E) => B
    readonly onRight: (a: A) => C
  }): (self: Either<E, A>) => B | C
  <E, A, B, C = B>(self: Either<E, A>, options: {
    readonly onLeft: (e: E) => B
    readonly onRight: (a: A) => C
  }): B | C
} = dual(
  2,
  <E, A, B, C = B>(self: Either<E, A>, { onLeft, onRight }: {
    readonly onLeft: (e: E) => B
    readonly onRight: (a: A) => C
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
  <A, B extends A, X extends A, E2>(
    filter: Refinement<A, B>,
    orLeftWith: (a: X) => E2
  ): <E>(self: Either<E, A>) => Either<E2 | E, B>
  <A, X extends A, Y extends A, E2>(
    filter: Predicate<X>,
    orLeftWith: (a: Y) => E2
  ): <E>(self: Either<E, A>) => Either<E2 | E, A>
  <E, A, B extends A, X extends A, E2>(
    self: Either<E, A>,
    filter: Refinement<A, B>,
    orLeftWith: (a: X) => E2
  ): Either<E | E2, B>
  <E, A, X extends A, Y extends A, E2>(
    self: Either<E, A>,
    filter: Predicate<X>,
    orLeftWith: (a: Y) => E2
  ): Either<E | E2, A>
} = dual(3, <E, A, E2>(
  self: Either<E, A>,
  filter: Predicate<A>,
  orLeftWith: (a: A) => E2
): Either<E | E2, A> => flatMap(self, (a) => filter(a) ? right(a) : left(orLeftWith(a))))

/**
 * @category getters
 * @since 2.0.0
 */
export const merge: <E, A>(self: Either<E, A>) => E | A = match({
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
  <E, B>(onLeft: (e: E) => B): <A>(self: Either<E, A>) => B | A
  <E, A, B>(self: Either<E, A>, onLeft: (e: E) => B): A | B
} = dual(
  2,
  <E, A, B>(self: Either<E, A>, onLeft: (e: E) => B): A | B => isLeft(self) ? onLeft(self.left) : self.right
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
export const getOrNull: <E, A>(self: Either<E, A>) => A | null = getOrElse(constNull)

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
export const getOrUndefined: <E, A>(self: Either<E, A>) => A | undefined = getOrElse(constUndefined)

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
  <E>(onLeft: (e: E) => unknown): <A>(self: Either<E, A>) => A
  <E, A>(self: Either<E, A>, onLeft: (e: E) => unknown): A
} = dual(2, <E, A>(self: Either<E, A>, onLeft: (e: E) => unknown): A => {
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
export const getOrThrow: <E, A>(self: Either<E, A>) => A = getOrThrowWith(() =>
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
  <E1, E2, B>(that: (e1: E1) => Either<E2, B>): <A>(self: Either<E1, A>) => Either<E2, A | B>
  <E1, A, E2, B>(self: Either<E1, A>, that: (e1: E1) => Either<E2, B>): Either<E2, A | B>
} = dual(
  2,
  <E1, A, E2, B>(self: Either<E1, A>, that: (e1: E1) => Either<E2, B>): Either<E2, A | B> =>
    isLeft(self) ? that(self.left) : right(self.right)
)

/**
 * @category sequencing
 * @since 2.0.0
 */
export const flatMap: {
  <A, E2, B>(f: (a: A) => Either<E2, B>): <E1>(self: Either<E1, A>) => Either<E1 | E2, B>
  <E1, A, E2, B>(self: Either<E1, A>, f: (a: A) => Either<E2, B>): Either<E1 | E2, B>
} = dual(
  2,
  <E1, A, E2, B>(self: Either<E1, A>, f: (a: A) => Either<E2, B>): Either<E1 | E2, B> =>
    isLeft(self) ? left(self.left) : f(self.right)
)

/**
 * Executes a sequence of two `Either`s. The second `Either` can be dependent on the result of the first `Either`.
 *
 * @category sequencing
 * @since 2.0.0
 */
export const andThen: {
  <A, E2, B>(f: (a: A) => Either<E2, B>): <E1>(self: Either<E1, A>) => Either<E1 | E2, B>
  <E2, B>(f: Either<E2, B>): <E1, A>(self: Either<E1, A>) => Either<E1 | E2, B>
  <E1, A, E2, B>(self: Either<E1, A>, f: (a: A) => Either<E2, B>): Either<E1 | E2, B>
  <E1, A, E2, B>(self: Either<E1, A>, f: Either<E2, B>): Either<E1 | E2, B>
} = dual(
  2,
  <E1, A, E2, B>(self: Either<E1, A>, f: (a: A) => Either<E2, B> | Either<E2, B>): Either<E1 | E2, B> =>
    isFunction(f) ? flatMap(self, f) : flatMap(self, () => f)
)

/**
 * @category zipping
 * @since 2.0.0
 */
export const zipWith: {
  <E2, A2, A, B>(
    that: Either<E2, A2>,
    f: (a: A, b: A2) => B
  ): <E>(self: Either<E, A>) => Either<E2 | E, B>
  <E, A, E2, A2, B>(
    self: Either<E, A>,
    that: Either<E2, A2>,
    f: (a: A, b: A2) => B
  ): Either<E | E2, B>
} = dual(
  3,
  <E, A, E2, A2, B>(self: Either<E, A>, that: Either<E2, A2>, f: (a: A, b: A2) => B): Either<E | E2, B> =>
    flatMap(self, (a) => map(that, (b) => f(a, b)))
)

/**
 * @category combining
 * @since 2.0.0
 */
export const ap: {
  <E2, A>(that: Either<E2, A>): <E, B>(self: Either<E, (a: A) => B>) => Either<E | E2, B>
  <E, A, B, E2>(self: Either<E, (a: A) => B>, that: Either<E2, A>): Either<E | E2, B>
} = dual(
  2,
  <E, A, B, E2>(self: Either<E, (a: A) => B>, that: Either<E2, A>): Either<E | E2, B> =>
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
 * assert.deepStrictEqual(Either.all({ a: Either.right(1), b: Either.right("hello") }), Either.right({ a: 1, b: "hello" }))
 * assert.deepStrictEqual(Either.all({ a: Either.right(1), b: Either.left("error") }), Either.left("error"))
 *
 * @category combining
 * @since 2.0.0
 */
// @ts-expect-error
export const all: <const I extends Iterable<Either<any, any>> | Record<string, Either<any, any>>>(
  input: I
) => [I] extends [ReadonlyArray<Either<any, any>>] ? Either<
    I[number] extends never ? never : [I[number]] extends [Either<infer E, any>] ? E : never,
    { -readonly [K in keyof I]: [I[K]] extends [Either<any, infer A>] ? A : never }
  >
  : [I] extends [Iterable<Either<infer E, infer A>>] ? Either<E, Array<A>>
  : Either<
    I[keyof I] extends never ? never : [I[keyof I]] extends [Either<infer E, any>] ? E : never,
    { -readonly [K in keyof I]: [I[K]] extends [Either<any, infer A>] ? A : never }
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
export const flip = <E, A>(self: Either<E, A>): Either<A, E> => isLeft(self) ? right(self.left) : left(self.right)

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
