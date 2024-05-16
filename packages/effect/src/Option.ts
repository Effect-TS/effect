/**
 * @since 2.0.0
 */
import type { Either } from "./Either.js"
import * as Equal from "./Equal.js"
import * as Equivalence from "./Equivalence.js"
import type { LazyArg } from "./Function.js"
import { constNull, constUndefined, dual, identity, isFunction } from "./Function.js"
import type { TypeLambda } from "./HKT.js"
import type { Inspectable } from "./Inspectable.js"
import * as doNotation from "./internal/doNotation.js"
import * as either from "./internal/either.js"
import * as option from "./internal/option.js"
import type { Order } from "./Order.js"
import * as order from "./Order.js"
import type { Pipeable } from "./Pipeable.js"
import type { Predicate, Refinement } from "./Predicate.js"
import type { Covariant, NoInfer, NotFunction } from "./Types.js"
import type * as Unify from "./Unify.js"
import * as Gen from "./Utils.js"

/**
 * @category models
 * @since 2.0.0
 */
export type Option<A> = None<A> | Some<A>

/**
 * @category symbols
 * @since 2.0.0
 */
export const TypeId: unique symbol = Symbol.for("effect/Option")

/**
 * @category symbols
 * @since 2.0.0
 */
export type TypeId = typeof TypeId

/**
 * @category models
 * @since 2.0.0
 */
export interface None<out A> extends Pipeable, Inspectable {
  readonly _tag: "None"
  readonly _op: "None"
  readonly [TypeId]: {
    readonly _A: Covariant<A>
  }
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: OptionUnify<this>
  [Unify.ignoreSymbol]?: OptionUnifyIgnore
}

/**
 * @category models
 * @since 2.0.0
 */
export interface Some<out A> extends Pipeable, Inspectable {
  readonly _tag: "Some"
  readonly _op: "Some"
  readonly value: A
  readonly [TypeId]: {
    readonly _A: Covariant<A>
  }
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: OptionUnify<this>
  [Unify.ignoreSymbol]?: OptionUnifyIgnore
}

/**
 * @category models
 * @since 2.0.0
 */
export interface OptionUnify<A extends { [Unify.typeSymbol]?: any }> {
  Option?: () => A[Unify.typeSymbol] extends Option<infer A0> | infer _ ? Option<A0> : never
}

/**
 * @since 2.0.0
 */
export declare namespace Option {
  /**
   * @since 2.0.0
   * @category type-level
   */
  export type Value<T extends Option<any>> = [T] extends [Option<infer _A>] ? _A : never
}

/**
 * @category models
 * @since 2.0.0
 */
export interface OptionUnifyIgnore {}

/**
 * @category type lambdas
 * @since 2.0.0
 */
export interface OptionTypeLambda extends TypeLambda {
  readonly type: Option<this["Target"]>
}

/**
 * Creates a new `Option` that represents the absence of a value.
 *
 * @category constructors
 * @since 2.0.0
 */
export const none = <A = never>(): Option<A> => option.none

/**
 * Creates a new `Option` that wraps the given value.
 *
 * @param value - The value to wrap.
 *
 * @category constructors
 * @since 2.0.0
 */
export const some: <A>(value: A) => Option<A> = option.some

/**
 * Tests if a value is a `Option`.
 *
 * @param input - The value to check.
 *
 * @example
 * import { Option } from "effect"
 *
 * assert.deepStrictEqual(Option.isOption(Option.some(1)), true)
 * assert.deepStrictEqual(Option.isOption(Option.none()), true)
 * assert.deepStrictEqual(Option.isOption({}), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isOption: (input: unknown) => input is Option<unknown> = option.isOption

/**
 * Determine if a `Option` is a `None`.
 *
 * @param self - The `Option` to check.
 *
 * @example
 * import { Option } from "effect"
 *
 * assert.deepStrictEqual(Option.isNone(Option.some(1)), false)
 * assert.deepStrictEqual(Option.isNone(Option.none()), true)
 *
 * @category guards
 * @since 2.0.0
 */
export const isNone: <A>(self: Option<A>) => self is None<A> = option.isNone

/**
 * Determine if a `Option` is a `Some`.
 *
 * @param self - The `Option` to check.
 *
 * @example
 * import { Option } from "effect"
 *
 * assert.deepStrictEqual(Option.isSome(Option.some(1)), true)
 * assert.deepStrictEqual(Option.isSome(Option.none()), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isSome: <A>(self: Option<A>) => self is Some<A> = option.isSome

/**
 * Matches the given `Option` and returns either the provided `onNone` value or the result of the provided `onSome`
 * function when passed the `Option`'s value.
 *
 * @param self - The `Option` to match
 * @param onNone - The value to be returned if the `Option` is `None`
 * @param onSome - The function to be called if the `Option` is `Some`, it will be passed the `Option`'s value and its result will be returned
 *
 * @example
 * import { pipe, Option } from "effect"
 *
 * assert.deepStrictEqual(
 *   pipe(Option.some(1), Option.match({ onNone: () => 'a none', onSome: (a) => `a some containing ${a}` })),
 *   'a some containing 1'
 * )
 *
 * assert.deepStrictEqual(
 *   pipe(Option.none(), Option.match({ onNone: () => 'a none', onSome: (a) => `a some containing ${a}` })),
 *   'a none'
 * )
 *
 * @category pattern matching
 * @since 2.0.0
 */
export const match: {
  <B, A, C = B>(options: {
    readonly onNone: LazyArg<B>
    readonly onSome: (a: A) => C
  }): (self: Option<A>) => B | C
  <A, B, C = B>(self: Option<A>, options: {
    readonly onNone: LazyArg<B>
    readonly onSome: (a: A) => C
  }): B | C
} = dual(
  2,
  <A, B, C = B>(self: Option<A>, { onNone, onSome }: {
    readonly onNone: LazyArg<B>
    readonly onSome: (a: A) => C
  }): B | C => isNone(self) ? onNone() : onSome(self.value)
)

/**
 * Returns a type guard from a `Option` returning function.
 * This function ensures that a type guard definition is type-safe.
 *
 * @example
 * import { Option } from "effect"
 *
 * const parsePositive = (n: number): Option.Option<number> =>
 *   n > 0 ? Option.some(n) : Option.none()
 *
 * const isPositive = Option.toRefinement(parsePositive)
 *
 * assert.deepStrictEqual(isPositive(1), true)
 * assert.deepStrictEqual(isPositive(-1), false)
 *
 * @category conversions
 * @since 2.0.0
 */
export const toRefinement = <A, B extends A>(f: (a: A) => Option<B>): (a: A) => a is B => (a: A): a is B => isSome(f(a))

/**
 * Converts an `Iterable` of values into an `Option`. Returns the first value of the `Iterable` wrapped in a `Some`
 * if the `Iterable` is not empty, otherwise returns `None`.
 *
 * @param collection - The `Iterable` to be converted to an `Option`.
 *
 * @example
 * import { Option } from "effect"
 *
 * assert.deepStrictEqual(Option.fromIterable([1, 2, 3]), Option.some(1))
 * assert.deepStrictEqual(Option.fromIterable([]), Option.none())
 *
 * @category constructors
 * @since 2.0.0
 */
export const fromIterable = <A>(collection: Iterable<A>): Option<A> => {
  for (const a of collection) {
    return some(a)
  }
  return none()
}

/**
 * Converts a `Either` to an `Option` discarding the error.
 *
 * Alias of {@link fromEither}.
 *
 * @example
 * import { Option, Either } from "effect"
 *
 * assert.deepStrictEqual(Option.getRight(Either.right('ok')), Option.some('ok'))
 * assert.deepStrictEqual(Option.getRight(Either.left('err')), Option.none())
 *
 * @category conversions
 * @since 2.0.0
 */
export const getRight: <R, L>(self: Either<R, L>) => Option<R> = either.getRight

/**
 * Converts a `Either` to an `Option` discarding the value.
 *
 * @example
 * import { Option, Either } from "effect"
 *
 * assert.deepStrictEqual(Option.getLeft(Either.right("ok")), Option.none())
 * assert.deepStrictEqual(Option.getLeft(Either.left("a")), Option.some("a"))
 *
 * @category conversions
 * @since 2.0.0
 */
export const getLeft: <R, L>(self: Either<R, L>) => Option<L> = either.getLeft

/**
 * Returns the value of the `Option` if it is `Some`, otherwise returns `onNone`
 *
 * @param self - The `Option` to get the value of.
 * @param onNone - Function that returns the default value to return if the `Option` is `None`.
 *
 * @example
 * import { pipe, Option } from "effect"
 *
 * assert.deepStrictEqual(pipe(Option.some(1), Option.getOrElse(() => 0)), 1)
 * assert.deepStrictEqual(pipe(Option.none(), Option.getOrElse(() => 0)), 0)
 *
 * @category getters
 * @since 2.0.0
 */
export const getOrElse: {
  <B>(onNone: LazyArg<B>): <A>(self: Option<A>) => B | A
  <A, B>(self: Option<A>, onNone: LazyArg<B>): A | B
} = dual(
  2,
  <A, B>(self: Option<A>, onNone: LazyArg<B>): A | B => isNone(self) ? onNone() : self.value
)

/**
 * Returns the provided `Option` `that` if `self` is `None`, otherwise returns `self`.
 *
 * @param self - The first `Option` to be checked.
 * @param that - The `Option` to return if `self` is `None`.
 *
 * @example
 * import { pipe, Option } from "effect"
 *
 * assert.deepStrictEqual(
 *   pipe(
 *     Option.none(),
 *     Option.orElse(() => Option.none())
 *   ),
 *   Option.none()
 * )
 * assert.deepStrictEqual(
 *   pipe(
 *     Option.some('a'),
 *     Option.orElse(() => Option.none())
 *   ),
 *   Option.some('a')
 * )
 * assert.deepStrictEqual(
 *   pipe(
 *     Option.none(),
 *     Option.orElse(() => Option.some('b'))
 *   ),
 *   Option.some('b')
 * )
 * assert.deepStrictEqual(
 *   pipe(
 *     Option.some('a'),
 *     Option.orElse(() => Option.some('b'))
 *   ),
 *   Option.some('a')
 * )
 *
 * @category error handling
 * @since 2.0.0
 */
export const orElse: {
  <B>(that: LazyArg<Option<B>>): <A>(self: Option<A>) => Option<B | A>
  <A, B>(self: Option<A>, that: LazyArg<Option<B>>): Option<A | B>
} = dual(
  2,
  <A, B>(self: Option<A>, that: LazyArg<Option<B>>): Option<A | B> => isNone(self) ? that() : self
)

/**
 * Returns the provided default value as `Some` if `self` is `None`, otherwise returns `self`.
 *
 * @param self - The first `Option` to be checked.
 * @param onNone - Function that returns the default value to return if the `Option` is `None`.
 *
 * @example
 * import { pipe, Option } from "effect"
 *
 * assert.deepStrictEqual(
 *   pipe(
 *     Option.none(),
 *     Option.orElseSome(() => 'b')
 *   ),
 *   Option.some('b')
 * )
 * assert.deepStrictEqual(
 *   pipe(
 *     Option.some('a'),
 *     Option.orElseSome(() => 'b')
 *   ),
 *   Option.some('a')
 * )
 *
 * @category error handling
 * @since 2.0.0
 */
export const orElseSome: {
  <B>(onNone: LazyArg<B>): <A>(self: Option<A>) => Option<B | A>
  <A, B>(self: Option<A>, onNone: LazyArg<B>): Option<A | B>
} = dual(
  2,
  <A, B>(self: Option<A>, onNone: LazyArg<B>): Option<A | B> => isNone(self) ? some(onNone()) : self
)

/**
 * Similar to `orElse`, but instead of returning a simple union, it returns an `Either` object,
 * which contains information about which of the two `Option`s has been chosen.
 *
 * This is useful when it's important to know whether the value was retrieved from the first `Option` or the second option.
 *
 * @param self - The first `Option` to be checked.
 * @param that - The second `Option` to be considered if the first `Option` is `None`.
 *
 * @category error handling
 * @since 2.0.0
 */
export const orElseEither: {
  <B>(that: LazyArg<Option<B>>): <A>(self: Option<A>) => Option<Either<B, A>>
  <A, B>(self: Option<A>, that: LazyArg<Option<B>>): Option<Either<B, A>>
} = dual(
  2,
  <A, B>(self: Option<A>, that: LazyArg<Option<B>>): Option<Either<B, A>> =>
    isNone(self) ? map(that(), either.right) : map(self, either.left)
)

/**
 * Given an `Iterable` collection of `Option`s, returns the first `Some` found in the collection.
 *
 * @param collection - An iterable collection of `Option` to be searched.
 *
 * @example
 * import { Option } from "effect"
 *
 * assert.deepStrictEqual(Option.firstSomeOf([Option.none(), Option.some(1), Option.some(2)]), Option.some(1))
 *
 * @category error handling
 * @since 2.0.0
 */
export const firstSomeOf = <A>(collection: Iterable<Option<A>>): Option<A> => {
  let out: Option<A> = none()
  for (out of collection) {
    if (isSome(out)) {
      return out
    }
  }
  return out
}

/**
 * Constructs a new `Option` from a nullable type. If the value is `null` or `undefined`, returns `None`, otherwise
 * returns the value wrapped in a `Some`.
 *
 * @param nullableValue - The nullable value to be converted to an `Option`.
 *
 * @example
 * import { Option } from "effect"
 *
 * assert.deepStrictEqual(Option.fromNullable(undefined), Option.none())
 * assert.deepStrictEqual(Option.fromNullable(null), Option.none())
 * assert.deepStrictEqual(Option.fromNullable(1), Option.some(1))
 *
 * @category conversions
 * @since 2.0.0
 */
export const fromNullable = <A>(
  nullableValue: A
): Option<
  NonNullable<A>
> => (nullableValue == null ? none() : some(nullableValue as NonNullable<A>))

/**
 * This API is useful for lifting a function that returns `null` or `undefined` into the `Option` context.
 *
 * @example
 * import { Option } from "effect"
 *
 * const parse = (s: string): number | undefined => {
 *   const n = parseFloat(s)
 *   return isNaN(n) ? undefined : n
 * }
 *
 * const parseOption = Option.liftNullable(parse)
 *
 * assert.deepStrictEqual(parseOption('1'), Option.some(1))
 * assert.deepStrictEqual(parseOption('not a number'), Option.none())
 *
 * @category conversions
 * @since 2.0.0
 */
export const liftNullable = <A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => B | null | undefined
): (...a: A) => Option<NonNullable<B>> =>
(...a) => fromNullable(f(...a))

/**
 * Returns the value of the `Option` if it is a `Some`, otherwise returns `null`.
 *
 * @param self - The `Option` to extract the value from.
 *
 * @example
 * import { Option } from "effect"
 *
 * assert.deepStrictEqual(Option.getOrNull(Option.some(1)), 1)
 * assert.deepStrictEqual(Option.getOrNull(Option.none()), null)
 *
 * @category getters
 * @since 2.0.0
 */
export const getOrNull: <A>(self: Option<A>) => A | null = getOrElse(constNull)

/**
 * Returns the value of the `Option` if it is a `Some`, otherwise returns `undefined`.
 *
 * @param self - The `Option` to extract the value from.
 *
 * @example
 * import { Option } from "effect"
 *
 * assert.deepStrictEqual(Option.getOrUndefined(Option.some(1)), 1)
 * assert.deepStrictEqual(Option.getOrUndefined(Option.none()), undefined)
 *
 * @category getters
 * @since 2.0.0
 */
export const getOrUndefined: <A>(self: Option<A>) => A | undefined = getOrElse(constUndefined)

/**
 * A utility function that lifts a function that throws exceptions into a function that returns an `Option`.
 *
 * This function is useful for any function that might throw an exception, allowing the developer to handle
 * the exception in a more functional way.
 *
 * @param f - the function that can throw exceptions.
 *
 * @example
 * import { Option } from "effect"
 *
 * const parse = Option.liftThrowable(JSON.parse)
 *
 * assert.deepStrictEqual(parse("1"), Option.some(1))
 * assert.deepStrictEqual(parse(""), Option.none())
 *
 * @category conversions
 * @since 2.0.0
 */
export const liftThrowable = <A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => B
): (...a: A) => Option<B> =>
(...a) => {
  try {
    return some(f(...a))
  } catch (e) {
    return none()
  }
}

/**
 * Extracts the value of an `Option` or throws if the `Option` is `None`.
 *
 * If a default error is sufficient for your use case and you don't need to configure the thrown error, see {@link getOrThrow}.
 *
 * @param self - The `Option` to extract the value from.
 * @param onNone - A function that will be called if the `Option` is `None`. It returns the error to be thrown.
 *
 * @example
 * import { Option } from "effect"
 *
 * assert.deepStrictEqual(
 *   Option.getOrThrowWith(Option.some(1), () => new Error('Unexpected None')),
 *   1
 * )
 * assert.throws(() => Option.getOrThrowWith(Option.none(), () => new Error('Unexpected None')))
 *
 * @category conversions
 * @since 2.0.0
 */
export const getOrThrowWith: {
  (onNone: () => unknown): <A>(self: Option<A>) => A
  <A>(self: Option<A>, onNone: () => unknown): A
} = dual(2, <A>(self: Option<A>, onNone: () => unknown): A => {
  if (isSome(self)) {
    return self.value
  }
  throw onNone()
})

/**
 * Extracts the value of an `Option` or throws if the `Option` is `None`.
 *
 * The thrown error is a default error. To configure the error thrown, see  {@link getOrThrowWith}.
 *
 * @param self - The `Option` to extract the value from.
 * @throws `Error("getOrThrow called on a None")`
 *
 * @example
 * import { Option } from "effect"
 *
 * assert.deepStrictEqual(Option.getOrThrow(Option.some(1)), 1)
 * assert.throws(() => Option.getOrThrow(Option.none()))
 *
 * @category conversions
 * @since 2.0.0
 */
export const getOrThrow: <A>(self: Option<A>) => A = getOrThrowWith(() => new Error("getOrThrow called on a None"))

/**
 * Maps the `Some` side of an `Option` value to a new `Option` value.
 *
 * @param self - An `Option` to map
 * @param f - The function to map over the value of the `Option`
 *
 * @category mapping
 * @since 2.0.0
 */
export const map: {
  <A, B>(f: (a: A) => B): (self: Option<A>) => Option<B>
  <A, B>(self: Option<A>, f: (a: A) => B): Option<B>
} = dual(
  2,
  <A, B>(self: Option<A>, f: (a: A) => B): Option<B> => isNone(self) ? none() : some(f(self.value))
)

/**
 * Maps the `Some` value of this `Option` to the specified constant value.
 *
 * @category mapping
 * @since 2.0.0
 */
export const as: {
  <B>(b: B): <X>(self: Option<X>) => Option<B>
} = dual(2, <X, B>(self: Option<X>, b: B): Option<B> => map(self, () => b))

/**
 * Maps the `Some` value of this `Option` to the `void` constant value.
 *
 * This is useful when the value of the `Option` is not needed, but the presence or absence of the value is important.
 *
 * @category mapping
 * @since 2.0.0
 */
export const asVoid: <_>(self: Option<_>) => Option<void> = as(undefined)

const void_: Option<void> = some(undefined)
export {
  /**
   * @since 2.0.0
   */
  void_ as void
}

/**
 * Applies a function to the value of an `Option` and flattens the result, if the input is `Some`.
 *
 * @category sequencing
 * @since 2.0.0
 */
export const flatMap: {
  <A, B>(f: (a: A) => Option<B>): (self: Option<A>) => Option<B>
  <A, B>(self: Option<A>, f: (a: A) => Option<B>): Option<B>
} = dual(
  2,
  <A, B>(self: Option<A>, f: (a: A) => Option<B>): Option<B> => isNone(self) ? none() : f(self.value)
)

/**
 * Executes a sequence of two `Option`s. The second `Option` can be dependent on the result of the first `Option`.
 *
 * @category sequencing
 * @since 2.0.0
 */
export const andThen: {
  <A, B>(f: (a: A) => Option<B>): (self: Option<A>) => Option<B>
  <B>(f: Option<B>): <A>(self: Option<A>) => Option<B>
  <A, B>(f: (a: A) => B): (self: Option<A>) => Option<B>
  <B>(f: NotFunction<B>): <A>(self: Option<A>) => Option<B>
  <A, B>(self: Option<A>, f: (a: A) => Option<B>): Option<B>
  <A, B>(self: Option<A>, f: Option<B>): Option<B>
  <A, B>(self: Option<A>, f: (a: A) => B): Option<B>
  <A, B>(self: Option<A>, f: NotFunction<B>): Option<B>
} = dual(
  2,
  <A, B>(self: Option<A>, f: (a: A) => Option<B> | Option<B>): Option<B> =>
    flatMap(self, (a) => {
      const b = isFunction(f) ? f(a) : f
      return isOption(b) ? b : some(b)
    })
)

/**
 * This is `flatMap` + `fromNullable`, useful when working with optional values.
 *
 * @example
 * import { pipe, Option } from "effect"
 *
 * interface Employee {
 *   company?: {
 *     address?: {
 *       street?: {
 *         name?: string
 *       }
 *     }
 *   }
 * }
 *
 * const employee1: Employee = { company: { address: { street: { name: 'high street' } } } }
 *
 * assert.deepStrictEqual(
 *   pipe(
 *     Option.some(employee1),
 *     Option.flatMapNullable(employee => employee.company?.address?.street?.name),
 *   ),
 *   Option.some('high street')
 * )
 *
 * const employee2: Employee = { company: { address: { street: {} } } }
 *
 * assert.deepStrictEqual(
 *   pipe(
 *     Option.some(employee2),
 *     Option.flatMapNullable(employee => employee.company?.address?.street?.name),
 *   ),
 *   Option.none()
 * )
 *
 * @category sequencing
 * @since 2.0.0
 */
export const flatMapNullable: {
  <A, B>(f: (a: A) => B | null | undefined): (self: Option<A>) => Option<NonNullable<B>>
  <A, B>(self: Option<A>, f: (a: A) => B | null | undefined): Option<NonNullable<B>>
} = dual(
  2,
  <A, B>(self: Option<A>, f: (a: A) => B | null | undefined): Option<NonNullable<B>> =>
    isNone(self) ? none() : fromNullable(f(self.value))
)

/**
 * @category sequencing
 * @since 2.0.0
 */
export const flatten: <A>(self: Option<Option<A>>) => Option<A> = flatMap(identity)

/**
 * @category zipping
 * @since 2.0.0
 */
export const zipRight: {
  <B>(that: Option<B>): <_>(self: Option<_>) => Option<B>
  <X, B>(self: Option<X>, that: Option<B>): Option<B>
} = dual(2, <X, B>(self: Option<X>, that: Option<B>): Option<B> => flatMap(self, () => that))

/**
 * @category sequencing
 * @since 2.0.0
 */
export const composeK: {
  <B, C>(bfc: (b: B) => Option<C>): <A>(afb: (a: A) => Option<B>) => (a: A) => Option<C>
  <A, B, C>(afb: (a: A) => Option<B>, bfc: (b: B) => Option<C>): (a: A) => Option<C>
} = dual(2, <A, B, C>(afb: (a: A) => Option<B>, bfc: (b: B) => Option<C>) => (a: A): Option<C> => flatMap(afb(a), bfc))

/**
 * Sequences the specified `that` `Option` but ignores its value.
 *
 * It is useful when we want to chain multiple operations, but only care about the result of `self`.
 *
 * @param that - The `Option` that will be ignored in the chain and discarded
 * @param self - The `Option` we care about
 *
 * @category zipping
 * @since 2.0.0
 */
export const zipLeft: {
  <_>(that: Option<_>): <A>(self: Option<A>) => Option<A>
  <A, X>(self: Option<A>, that: Option<X>): Option<A>
} = dual(2, <A, X>(self: Option<A>, that: Option<X>): Option<A> => tap(self, () => that))

/**
 * Applies the provided function `f` to the value of the `Option` if it is `Some` and returns the original `Option`
 * unless `f` returns `None`, in which case it returns `None`.
 *
 * This function is useful for performing additional computations on the value of the input `Option` without affecting its value.
 *
 * @param f - Function to apply to the value of the `Option` if it is `Some`
 * @param self - The `Option` to apply the function to
 *
 * @example
 * import { Option } from "effect"
 *
 * const getInteger = (n: number) => Number.isInteger(n) ? Option.some(n) : Option.none()
 *
 * assert.deepStrictEqual(Option.tap(Option.none(), getInteger), Option.none())
 * assert.deepStrictEqual(Option.tap(Option.some(1), getInteger), Option.some(1))
 * assert.deepStrictEqual(Option.tap(Option.some(1.14), getInteger), Option.none())
 *
 * @category sequencing
 * @since 2.0.0
 */
export const tap: {
  <A, X>(f: (a: A) => Option<X>): (self: Option<A>) => Option<A>
  <A, X>(self: Option<A>, f: (a: A) => Option<X>): Option<A>
} = dual(2, <A, X>(self: Option<A>, f: (a: A) => Option<X>): Option<A> => flatMap(self, (a) => map(f(a), () => a)))

/**
 * @category combining
 * @since 2.0.0
 */
export const product = <A, B>(self: Option<A>, that: Option<B>): Option<[A, B]> =>
  isSome(self) && isSome(that) ? some([self.value, that.value]) : none()

/**
 * @category combining
 * @since 2.0.0
 */
export const productMany = <A>(
  self: Option<A>,
  collection: Iterable<Option<A>>
): Option<[A, ...Array<A>]> => {
  if (isNone(self)) {
    return none()
  }
  const out: [A, ...Array<A>] = [self.value]
  for (const o of collection) {
    if (isNone(o)) {
      return none()
    }
    out.push(o.value)
  }
  return some(out)
}

/**
 * Takes a structure of `Option`s and returns an `Option` of values with the same structure.
 *
 * - If a tuple is supplied, then the returned `Option` will contain a tuple with the same length.
 * - If a struct is supplied, then the returned `Option` will contain a struct with the same keys.
 * - If an iterable is supplied, then the returned `Option` will contain an array.
 *
 * @param fields - the struct of `Option`s to be sequenced.
 *
 * @example
 * import { Option } from "effect"
 *
 * assert.deepStrictEqual(Option.all([Option.some(1), Option.some(2)]), Option.some([1, 2]))
 * assert.deepStrictEqual(Option.all({ a: Option.some(1), b: Option.some("hello") }), Option.some({ a: 1, b: "hello" }))
 * assert.deepStrictEqual(Option.all({ a: Option.some(1), b: Option.none() }), Option.none())
 *
 * @category combining
 * @since 2.0.0
 */
// @ts-expect-error
export const all: <const I extends Iterable<Option<any>> | Record<string, Option<any>>>(
  input: I
) => [I] extends [ReadonlyArray<Option<any>>] ? Option<
    { -readonly [K in keyof I]: [I[K]] extends [Option<infer A>] ? A : never }
  >
  : [I] extends [Iterable<Option<infer A>>] ? Option<Array<A>>
  : Option<{ -readonly [K in keyof I]: [I[K]] extends [Option<infer A>] ? A : never }> = (
    input: Iterable<Option<any>> | Record<string, Option<any>>
  ): Option<any> => {
    if (Symbol.iterator in input) {
      const out: Array<Option<any>> = []
      for (const o of (input as Iterable<Option<any>>)) {
        if (isNone(o)) {
          return none()
        }
        out.push(o.value)
      }
      return some(out)
    }

    const out: Record<string, any> = {}
    for (const key of Object.keys(input)) {
      const o = input[key]
      if (isNone(o)) {
        return none()
      }
      out[key] = o.value
    }
    return some(out)
  }

/**
 * Zips two `Option` values together using a provided function, returning a new `Option` of the result.
 *
 * @param self - The left-hand side of the zip operation
 * @param that - The right-hand side of the zip operation
 * @param f - The function used to combine the values of the two `Option`s
 *
 * @example
 * import { Option } from "effect"
 *
 * type Complex = [real: number, imaginary: number]
 *
 * const complex = (real: number, imaginary: number): Complex => [real, imaginary]
 *
 * assert.deepStrictEqual(Option.zipWith(Option.none(), Option.none(), complex), Option.none())
 * assert.deepStrictEqual(Option.zipWith(Option.some(1), Option.none(), complex), Option.none())
 * assert.deepStrictEqual(Option.zipWith(Option.none(), Option.some(1), complex), Option.none())
 * assert.deepStrictEqual(Option.zipWith(Option.some(1), Option.some(2), complex), Option.some([1, 2]))
 *
 * assert.deepStrictEqual(Option.zipWith(Option.some(1), complex)(Option.some(2)), Option.some([2, 1]))
 *
 * @category zipping
 * @since 2.0.0
 */
export const zipWith: {
  <B, A, C>(that: Option<B>, f: (a: A, b: B) => C): (self: Option<A>) => Option<C>
  <A, B, C>(self: Option<A>, that: Option<B>, f: (a: A, b: B) => C): Option<C>
} = dual(
  3,
  <A, B, C>(self: Option<A>, that: Option<B>, f: (a: A, b: B) => C): Option<C> =>
    map(product(self, that), ([a, b]) => f(a, b))
)

/**
 * @category combining
 * @since 2.0.0
 */
export const ap: {
  <A>(that: Option<A>): <B>(self: Option<(a: A) => B>) => Option<B>
  <A, B>(self: Option<(a: A) => B>, that: Option<A>): Option<B>
} = dual(2, <A, B>(self: Option<(a: A) => B>, that: Option<A>): Option<B> => zipWith(self, that, (f, a) => f(a)))

/**
 * Reduces an `Iterable` of `Option<A>` to a single value of type `B`, elements that are `None` are ignored.
 *
 * @param self - The Iterable of `Option<A>` to be reduced.
 * @param b - The initial value of the accumulator.
 * @param f - The reducing function that takes the current accumulator value and the unwrapped value of an `Option<A>`.
 *
 * @example
 * import { pipe, Option } from "effect"
 *
 * const iterable = [Option.some(1), Option.none(), Option.some(2), Option.none()]
 * assert.deepStrictEqual(pipe(iterable, Option.reduceCompact(0, (b, a) => b + a)), 3)
 *
 * @category folding
 * @since 2.0.0
 */
export const reduceCompact: {
  <B, A>(b: B, f: (b: B, a: A) => B): (self: Iterable<Option<A>>) => B
  <A, B>(self: Iterable<Option<A>>, b: B, f: (b: B, a: A) => B): B
} = dual(
  3,
  <A, B>(self: Iterable<Option<A>>, b: B, f: (b: B, a: A) => B): B => {
    let out: B = b
    for (const oa of self) {
      if (isSome(oa)) {
        out = f(out, oa.value)
      }
    }
    return out
  }
)

/**
 * Transforms an `Option` into an `Array`.
 * If the input is `None`, an empty array is returned.
 * If the input is `Some`, the value is wrapped in an array.
 *
 * @param self - The `Option` to convert to an array.
 *
 * @example
 * import { Option } from "effect"
 *
 * assert.deepStrictEqual(Option.toArray(Option.some(1)), [1])
 * assert.deepStrictEqual(Option.toArray(Option.none()), [])
 *
 * @category conversions
 * @since 2.0.0
 */
export const toArray = <A>(self: Option<A>): Array<A> => isNone(self) ? [] : [self.value]

/**
 * @category filtering
 * @since 2.0.0
 */
export const partitionMap: {
  <A, B, C>(f: (a: A) => Either<C, B>): (self: Option<A>) => [left: Option<B>, right: Option<C>]
  <A, B, C>(self: Option<A>, f: (a: A) => Either<C, B>): [left: Option<B>, right: Option<C>]
} = dual(2, <A, B, C>(
  self: Option<A>,
  f: (a: A) => Either<C, B>
): [excluded: Option<B>, satisfying: Option<C>] => {
  if (isNone(self)) {
    return [none(), none()]
  }
  const e = f(self.value)
  return either.isLeft(e) ? [some(e.left), none()] : [none(), some(e.right)]
})

/**
 * Maps over the value of an `Option` and filters out `None`s.
 *
 * Useful when in addition to filtering you also want to change the type of the `Option`.
 *
 * @param self - The `Option` to map over.
 * @param f - A function to apply to the value of the `Option`.
 *
 * @example
 * import { Option } from "effect"
 *
 * const evenNumber = (n: number) => n % 2 === 0 ? Option.some(n) : Option.none()
 *
 * assert.deepStrictEqual(Option.filterMap(Option.none(), evenNumber), Option.none())
 * assert.deepStrictEqual(Option.filterMap(Option.some(3), evenNumber), Option.none())
 * assert.deepStrictEqual(Option.filterMap(Option.some(2), evenNumber), Option.some(2))
 *
 * @category filtering
 * @since 2.0.0
 */
export const filterMap: {
  <A, B>(f: (a: A) => Option<B>): (self: Option<A>) => Option<B>
  <A, B>(self: Option<A>, f: (a: A) => Option<B>): Option<B>
} = dual(
  2,
  <A, B>(self: Option<A>, f: (a: A) => Option<B>): Option<B> => isNone(self) ? none() : f(self.value)
)

/**
 * Filters an `Option` using a predicate. If the predicate is not satisfied or the `Option` is `None` returns `None`.
 *
 * If you need to change the type of the `Option` in addition to filtering, see `filterMap`.
 *
 * @param predicate - A predicate function to apply to the `Option` value.
 * @param fb - The `Option` to filter.
 *
 * @example
 * import { Option } from "effect"
 *
 * // predicate
 * const isEven = (n: number) => n % 2 === 0
 *
 * assert.deepStrictEqual(Option.filter(Option.none(), isEven), Option.none())
 * assert.deepStrictEqual(Option.filter(Option.some(3), isEven), Option.none())
 * assert.deepStrictEqual(Option.filter(Option.some(2), isEven), Option.some(2))
 *
 * // refinement
 * const isNumber = (v: unknown): v is number => typeof v === "number"
 *
 * assert.deepStrictEqual(Option.filter(Option.none(), isNumber), Option.none())
 * assert.deepStrictEqual(Option.filter(Option.some('hello'), isNumber), Option.none())
 * assert.deepStrictEqual(Option.filter(Option.some(2), isNumber), Option.some(2))
 *
 * @category filtering
 * @since 2.0.0
 */
export const filter: {
  <A, B extends A>(refinement: Refinement<NoInfer<A>, B>): (self: Option<A>) => Option<B>
  <A>(predicate: Predicate<NoInfer<A>>): (self: Option<A>) => Option<A>
  <A, B extends A>(self: Option<A>, refinement: Refinement<A, B>): Option<B>
  <A>(self: Option<A>, predicate: Predicate<A>): Option<A>
} = dual(
  2,
  <A>(self: Option<A>, predicate: Predicate<A>): Option<A> =>
    filterMap(self, (b) => (predicate(b) ? option.some(b) : option.none))
)

/**
 * @example
 * import { Option, Number } from "effect"
 *
 * const isEquivalent = Option.getEquivalence(Number.Equivalence)
 * assert.deepStrictEqual(isEquivalent(Option.none(), Option.none()), true)
 * assert.deepStrictEqual(isEquivalent(Option.none(), Option.some(1)), false)
 * assert.deepStrictEqual(isEquivalent(Option.some(1), Option.none()), false)
 * assert.deepStrictEqual(isEquivalent(Option.some(1), Option.some(2)), false)
 * assert.deepStrictEqual(isEquivalent(Option.some(1), Option.some(1)), true)
 *
 * @category equivalence
 * @since 2.0.0
 */
export const getEquivalence = <A>(isEquivalent: Equivalence.Equivalence<A>): Equivalence.Equivalence<Option<A>> =>
  Equivalence.make((x, y) => isNone(x) ? isNone(y) : isNone(y) ? false : isEquivalent(x.value, y.value))

/**
 * The `Order` instance allows `Option` values to be compared with
 * `compare`, whenever there is an `Order` instance for
 * the type the `Option` contains.
 *
 * `None` is considered to be less than any `Some` value.
 *
 * @example
 * import { pipe, Option, Number } from "effect"
 *
 * const O = Option.getOrder(Number.Order)
 * assert.deepStrictEqual(O(Option.none(), Option.none()), 0)
 * assert.deepStrictEqual(O(Option.none(), Option.some(1)), -1)
 * assert.deepStrictEqual(O(Option.some(1), Option.none()), 1)
 * assert.deepStrictEqual(O(Option.some(1), Option.some(2)), -1)
 * assert.deepStrictEqual(O(Option.some(1), Option.some(1)), 0)
 *
 * @category sorting
 * @since 2.0.0
 */
export const getOrder = <A>(O: Order<A>): Order<Option<A>> =>
  order.make((self, that) => isSome(self) ? (isSome(that) ? O(self.value, that.value) : 1) : -1)

/**
 * Lifts a binary function into `Option`.
 *
 * @param f - The function to lift.
 *
 * @category lifting
 * @since 2.0.0
 */
export const lift2 = <A, B, C>(f: (a: A, b: B) => C): {
  (that: Option<B>): (self: Option<A>) => Option<C>
  (self: Option<A>, that: Option<B>): Option<C>
} => dual(2, (self: Option<A>, that: Option<B>): Option<C> => zipWith(self, that, f))

/**
 * Transforms a `Predicate` function into a `Some` of the input value if the predicate returns `true` or `None`
 * if the predicate returns `false`.
 *
 * @param predicate - A `Predicate` function that takes in a value of type `A` and returns a boolean.
 *
 * @example
 * import { Option } from "effect"
 *
 * const getOption = Option.liftPredicate((n: number) => n >= 0)
 *
 * assert.deepStrictEqual(getOption(-1), Option.none())
 * assert.deepStrictEqual(getOption(1), Option.some(1))
 *
 * @category lifting
 * @since 2.0.0
 */
export const liftPredicate: { // Note: I intentionally avoid using the NoInfer pattern here.
  <A, B extends A>(refinement: Refinement<A, B>): (a: A) => Option<B>
  <B extends A, A = B>(predicate: Predicate<A>): (b: B) => Option<B>
  <A, B extends A>(
    self: A,
    refinement: Refinement<A, B>
  ): Option<B>
  <B extends A, A = B>(
    self: B,
    predicate: Predicate<A>
  ): Option<B>
} = dual(
  2,
  <B extends A, A = B>(b: B, predicate: Predicate<A>): Option<B> => predicate(b) ? some(b) : none()
)

/**
 * Returns a function that checks if a `Option` contains a given value using a provided `isEquivalent` function.
 *
 * @param equivalent - An `Equivalence` instance to compare values of the `Option`.
 * @param self - The `Option` to apply the comparison to.
 * @param a - The value to compare against the `Option`.
 *
 * @example
 * import { pipe, Option, Number } from "effect"
 *
 * assert.deepStrictEqual(pipe(Option.some(2), Option.containsWith(Number.Equivalence)(2)), true)
 * assert.deepStrictEqual(pipe(Option.some(1), Option.containsWith(Number.Equivalence)(2)), false)
 * assert.deepStrictEqual(pipe(Option.none(), Option.containsWith(Number.Equivalence)(2)), false)
 *
 * @category elements
 * @since 2.0.0
 */
export const containsWith = <A>(isEquivalent: (self: A, that: A) => boolean): {
  (a: A): (self: Option<A>) => boolean
  (self: Option<A>, a: A): boolean
} => dual(2, (self: Option<A>, a: A): boolean => isNone(self) ? false : isEquivalent(self.value, a))

const _equivalence = Equal.equivalence()

/**
 * Returns a function that checks if an `Option` contains a given value using the default `Equivalence`.
 *
 * @category elements
 * @since 2.0.0
 */
export const contains: {
  <A>(a: A): (self: Option<A>) => boolean
  <A>(self: Option<A>, a: A): boolean
} = containsWith(_equivalence)

/**
 * Check if a value in an `Option` type meets a certain predicate.
 *
 * @param self - The `Option` to check.
 * @param predicate - The condition to check.
 *
 * @example
 * import { pipe, Option } from "effect"
 *
 * const isEven = (n: number) => n % 2 === 0
 *
 * assert.deepStrictEqual(pipe(Option.some(2), Option.exists(isEven)), true)
 * assert.deepStrictEqual(pipe(Option.some(1), Option.exists(isEven)), false)
 * assert.deepStrictEqual(pipe(Option.none(), Option.exists(isEven)), false)
 *
 * @since 2.0.0
 */
export const exists: {
  <A, B extends A>(refinement: Refinement<NoInfer<A>, B>): (self: Option<A>) => self is Option<B>
  <A>(predicate: Predicate<NoInfer<A>>): (self: Option<A>) => boolean
  <A, B extends A>(self: Option<A>, refinement: Refinement<A, B>): self is Option<B>
  <A>(self: Option<A>, predicate: Predicate<A>): boolean
} = dual(
  2,
  <A, B extends A>(self: Option<A>, refinement: Refinement<A, B>): self is Option<B> =>
    isNone(self) ? false : refinement(self.value)
)

// -------------------------------------------------------------------------------------
// do notation
// -------------------------------------------------------------------------------------

/**
 * The "do simulation" in allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
 *
 * Here's how the do simulation works:
 *
 * 1. Start the do simulation using the `Do` value
 * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Option` values
 * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
 * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
 * 5. Regular `Option` functions like `map` and `filter` can still be used within the do simulation. These functions will receive the accumulated variables as arguments within the scope
 *
 * @see {@link Do}
 * @see {@link bind}
 * @see {@link let_ let}
 *
 * @example
 * import { Option, pipe } from "effect"
 *
 * const result = pipe(
 *   Option.Do,
 *   Option.bind("x", () => Option.some(2)),
 *   Option.bind("y", () => Option.some(3)),
 *   Option.let("sum", ({ x, y }) => x + y),
 *   Option.filter(({ x, y }) => x * y > 5)
 * )
 * assert.deepStrictEqual(result, Option.some({ x: 2, y: 3, sum: 5 }))
 *
 * @category do notation
 * @since 2.0.0
 */
export const bindTo: {
  <N extends string>(name: N): <A>(self: Option<A>) => Option<{ [K in N]: A }>
  <A, N extends string>(self: Option<A>, name: N): Option<{ [K in N]: A }>
} = doNotation.bindTo<OptionTypeLambda>(map)

const let_: {
  <N extends string, A extends object, B>(
    name: Exclude<N, keyof A>,
    f: (a: A) => B
  ): (self: Option<A>) => Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>
  <A extends object, N extends string, B>(
    self: Option<A>,
    name: Exclude<N, keyof A>,
    f: (a: A) => B
  ): Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>
} = doNotation.let_<OptionTypeLambda>(map)

export {
  /**
   * The "do simulation" in allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
   *
   * Here's how the do simulation works:
   *
   * 1. Start the do simulation using the `Do` value
   * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Option` values
   * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
   * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
   * 5. Regular `Option` functions like `map` and `filter` can still be used within the do simulation. These functions will receive the accumulated variables as arguments within the scope
   *
   * @see {@link Do}
   * @see {@link bind}
   * @see {@link bindTo}
   *
   * @example
   * import { Option, pipe } from "effect"
   *
   * const result = pipe(
   *   Option.Do,
   *   Option.bind("x", () => Option.some(2)),
   *   Option.bind("y", () => Option.some(3)),
   *   Option.let("sum", ({ x, y }) => x + y),
   *   Option.filter(({ x, y }) => x * y > 5)
   * )
   * assert.deepStrictEqual(result, Option.some({ x: 2, y: 3, sum: 5 }))
   *
   * @category do notation
   * @since 2.0.0
   */
  let_ as let
}

/**
 * The "do simulation" in allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
 *
 * Here's how the do simulation works:
 *
 * 1. Start the do simulation using the `Do` value
 * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Option` values
 * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
 * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
 * 5. Regular `Option` functions like `map` and `filter` can still be used within the do simulation. These functions will receive the accumulated variables as arguments within the scope
 *
 * @see {@link Do}
 * @see {@link bindTo}
 * @see {@link let_ let}
 *
 * @example
 * import { Option, pipe } from "effect"
 *
 * const result = pipe(
 *   Option.Do,
 *   Option.bind("x", () => Option.some(2)),
 *   Option.bind("y", () => Option.some(3)),
 *   Option.let("sum", ({ x, y }) => x + y),
 *   Option.filter(({ x, y }) => x * y > 5)
 * )
 * assert.deepStrictEqual(result, Option.some({ x: 2, y: 3, sum: 5 }))
 *
 * @category do notation
 * @since 2.0.0
 */
export const bind: {
  <N extends string, A extends object, B>(
    name: Exclude<N, keyof A>,
    f: (a: A) => Option<B>
  ): (self: Option<A>) => Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>
  <A extends object, N extends string, B>(
    self: Option<A>,
    name: Exclude<N, keyof A>,
    f: (a: A) => Option<B>
  ): Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>
} = doNotation.bind<OptionTypeLambda>(map, flatMap)

/**
 * The "do simulation" in allows you to write code in a more declarative style, similar to the "do notation" in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`.
 *
 * Here's how the do simulation works:
 *
 * 1. Start the do simulation using the `Do` value
 * 2. Within the do simulation scope, you can use the `bind` function to define variables and bind them to `Option` values
 * 3. You can accumulate multiple `bind` statements to define multiple variables within the scope
 * 4. Inside the do simulation scope, you can also use the `let` function to define variables and bind them to simple values
 * 5. Regular `Option` functions like `map` and `filter` can still be used within the do simulation. These functions will receive the accumulated variables as arguments within the scope
 *
 * @see {@link bindTo}
 * @see {@link bind}
 * @see {@link let_ let}
 *
 * @example
 * import { Option, pipe } from "effect"
 *
 * const result = pipe(
 *   Option.Do,
 *   Option.bind("x", () => Option.some(2)),
 *   Option.bind("y", () => Option.some(3)),
 *   Option.let("sum", ({ x, y }) => x + y),
 *   Option.filter(({ x, y }) => x * y > 5)
 * )
 * assert.deepStrictEqual(result, Option.some({ x: 2, y: 3, sum: 5 }))
 *
 * @category do notation
 * @since 2.0.0
 */
export const Do: Option<{}> = some({})

const adapter = Gen.adapter<OptionTypeLambda>()

/**
 * @category generators
 * @since 2.0.0
 */
export const gen: Gen.Gen<OptionTypeLambda, Gen.Adapter<OptionTypeLambda>> = (...args) => {
  let f: any
  if (args.length === 1) {
    f = args[0]
  } else {
    f = args[1].bind(args[0])
  }
  const iterator = f(adapter)
  let state: IteratorYieldResult<any> | IteratorReturnResult<any> = iterator.next()
  if (state.done) {
    return some(state.value)
  } else {
    let current = state.value
    if (Gen.isGenKind(current)) {
      current = current.value
    } else {
      current = Gen.yieldWrapGet(current)
    }
    if (isNone(current)) {
      return current
    }
    while (!state.done) {
      state = iterator.next(current.value as never)
      if (!state.done) {
        current = state.value
        if (Gen.isGenKind(current)) {
          current = current.value
        } else {
          current = Gen.yieldWrapGet(current)
        }
        if (isNone(current)) {
          return current
        }
      }
    }
    return some(state.value)
  }
}
