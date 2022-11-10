/**
 * A data structure providing "inclusive-or" as opposed to `Either`'s "exclusive-or".
 *
 * If you interpret `Either<E, A>` as suggesting the computation may either fail or of (exclusively), then
 * `These<E, A>` may fail, of, or do both at the same time.
 *
 * There are a few ways to interpret the both case:
 *
 * - You can think of a computation that has a non-fatal error.
 * - You can think of a computation that went as far as it could before erroring.
 * - You can think of a computation that keeps track of errors as it completes.
 *
 * Another way you can think of `These<E, A>` is saying that we want to handle `E` kind of data, `A` kind of data, or
 * both `E` and `A` kind of data at the same time. This is particularly useful when it comes to displaying UI's.
 *
 * (description adapted from https://package.elm-lang.org/packages/joneshf/elm-these)
 *
 * Adapted from https://github.com/purescript-contrib/purescript-these
 *
 * @since 1.0.0
 */
import type { Kind, TypeLambda } from "@fp-ts/core/HKT"
import * as applicative from "@fp-ts/core/typeclass/Applicative"
import * as bicovariant from "@fp-ts/core/typeclass/Bicovariant"
import * as chainable from "@fp-ts/core/typeclass/Chainable"
import * as covariant from "@fp-ts/core/typeclass/Covariant"
import * as flatMap_ from "@fp-ts/core/typeclass/FlatMap"
import type * as foldable from "@fp-ts/core/typeclass/Foldable"
import * as invariant from "@fp-ts/core/typeclass/Invariant"
import type * as monad from "@fp-ts/core/typeclass/Monad"
import type { Monoid } from "@fp-ts/core/typeclass/Monoid"
import * as of_ from "@fp-ts/core/typeclass/Of"
import type * as pointed from "@fp-ts/core/typeclass/Pointed"
import * as product_ from "@fp-ts/core/typeclass/Product"
import type * as semiAlternative from "@fp-ts/core/typeclass/SemiAlternative"
import * as semiApplicative from "@fp-ts/core/typeclass/SemiApplicative"
import * as semiCoproduct from "@fp-ts/core/typeclass/SemiCoproduct"
import type { Semigroup } from "@fp-ts/core/typeclass/Semigroup"
import * as semiProduct from "@fp-ts/core/typeclass/SemiProduct"
import * as traversable from "@fp-ts/core/typeclass/Traversable"
import * as chunk from "@fp-ts/data/Chunk"
import type { Either, Left, Right } from "@fp-ts/data/Either"
import * as E from "@fp-ts/data/Either"
import { equals } from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import type { Option } from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"
import type { Refinement } from "@fp-ts/data/Refinement"

/**
 * @category model
 * @since 1.0.0
 */
export interface Both<E, A> {
  readonly _tag: "Both"
  readonly left: E
  readonly right: A
}

/**
 * @category model
 * @since 1.0.0
 */
export type These<E, A> = Either<E, A> | Both<E, A>

/**
 * @category model
 * @since 1.0.0
 */
export type Validated<E, A> = These<chunk.Chunk<E>, A>

/**
 * @category type lambdas
 * @since 1.0.0
 */
export interface TheseTypeLambda extends TypeLambda {
  readonly type: These<this["Out1"], this["Target"]>
}

/**
 * @category type lambdas
 * @since 3.0.0
 */
export interface ValidatedTypeLambda extends TypeLambda {
  readonly type: Validated<this["Out1"], this["Target"]>
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const left = <E>(left: E): These<E, never> => ({ _tag: "Left", left })

/**
 * @category constructors
 * @since 1.0.0
 */
export const right = <A>(right: A): These<never, A> => ({ _tag: "Right", right })

/**
 * Alias of `right`.
 *
 * @category constructors
 * @since 1.0.0
 */
export const of = right

/**
 * @category constructors
 * @since 1.0.0
 */
export const both = <E, A>(left: E, right: A): These<E, A> => ({
  _tag: "Both",
  left,
  right
})

/**
 * @category constructors
 * @since 1.0.0
 */
export const fail = <E>(e: E): Validated<E, never> => left(chunk.make(e))

/**
 * Alias of `right`.
 *
 * @category constructors
 * @since 1.0.0
 */
export const succeed: <A>(a: A) => Validated<never, A> = right

/**
 * @category constructors
 * @since 1.0.0
 */
export const warn = <E, A>(e: E, a: A): Validated<E, A> => both(chunk.make(e), a)

/**
 * @category constructors
 * @since 1.0.0
 */
export const leftOrBoth = <E>(e: E) =>
  <A>(self: Option<A>): These<E, A> => O.isNone(self) ? left(e) : both(e, self.value)

/**
 * @category constructors
 * @since 1.0.0
 */
export const rightOrBoth = <A>(a: A) =>
  <E>(self: Option<E>): These<E, A> => O.isNone(self) ? right(a) : both(self.value, a)

/**
 * @category pattern matching
 * @since 1.0.0
 */
export const match = <E, B, A, C = B, D = B>(
  onLeft: (e: E) => B,
  onRight: (a: A) => C,
  onBoth: (e: E, a: A) => D
) =>
  (self: These<E, A>): B | C | D => {
    switch (self._tag) {
      case "Left":
        return onLeft(self.left)
      case "Right":
        return onRight(self.right)
      case "Both":
        return onBoth(self.left, self.right)
    }
  }

/**
 * @since 1.0.0
 */
export const reverse: <E, A>(self: These<E, A>) => These<A, E> = match(
  right,
  left,
  (e, a) => both(a, e)
)

/**
 * Returns `true` if the these is an instance of `Left`, `false` otherwise
 *
 * @category guards
 * @since 1.0.0
 */
export const isLeft = <E, A>(self: These<E, A>): self is Left<E> => self._tag === "Left"

/**
 * @category guards
 * @since 1.0.0
 */
export const isLeftOrBoth = <E, A>(self: These<E, A>): self is Left<E> | Both<E, A> =>
  self._tag !== "Right"

/**
 * Returns `true` if the these is an instance of `Right`, `false` otherwise
 *
 * @category guards
 * @since 1.0.0
 */
export const isRight = <E, A>(self: These<E, A>): self is Right<A> => self._tag === "Right"

/**
 * @category guards
 * @since 1.0.0
 */
export const isRightOrBoth = <E, A>(self: These<E, A>): self is Right<A> | Both<E, A> =>
  self._tag !== "Left"

/**
 * Returns `true` if the these is an instance of `Both`, `false` otherwise
 *
 * @category guards
 * @since 1.0.0
 */
export const isBoth = <E, A>(self: These<E, A>): self is Both<E, A> => self._tag === "Both"

/**
 * Constructs a new `These` from a function that might throw.
 *
 * @category interop
 * @since 1.0.0
 */
export const fromThrowable = <A, E>(
  f: () => A,
  onThrow: (error: unknown) => E
): These<E, A> => {
  try {
    return right(f())
  } catch (e) {
    return left(onThrow(e))
  }
}

/**
 * Lifts a function that may throw to one returning a `These`.
 *
 * @category interop
 * @since 1.0.0
 */
export const liftThrowable = <A extends ReadonlyArray<unknown>, B, E>(
  f: (...a: A) => B,
  onThrow: (error: unknown) => E
): ((...a: A) => These<E, B>) => (...a) => fromThrowable(() => f(...a), onThrow)

/**
 * @category interop
 * @since 1.0.0
 */
export const getOrThrow = <E>(onLeft: (e: E) => unknown) =>
  <A>(self: These<E, A>): A => {
    if (isRightOrBoth(self)) {
      return self.right
    }
    throw onLeft(self.left)
  }

/**
 * @category interop
 * @since 1.0.0
 */
export const getRightOnlyOrThrow = <E>(onLeft: (e: E) => unknown) =>
  <A>(self: These<E, A>): A => {
    if (isRight(self)) {
      return self.right
    }
    throw onLeft(self.left)
  }

/**
 * @category conversions
 * @since 1.0.0
 */
export const fromNullable = <E>(onNullable: E) =>
  <A>(a: A): These<E, NonNullable<A>> => a == null ? left(onNullable) : right(a as NonNullable<A>)

/**
 * @category conversions
 * @since 1.0.0
 */
export const fromEither = <E, A>(self: Either<E, A>): Validated<E, A> =>
  E.isLeft(self) ? left(chunk.make(self.left)) : self

/**
 * @category conversions
 * @since 1.0.0
 */
export const toEither = <E, A>(
  onBoth: (e: E, a: A) => Either<E, A>
) => (self: These<E, A>): Either<E, A> => isBoth(self) ? onBoth(self.left, self.right) : self

/**
 * @category conversions
 * @since 1.0.0
 */
export const absolve: <E, A>(self: These<E, A>) => Either<E, A> = toEither((
  _,
  a
) => E.right(a))

/**
 * @category conversions
 * @since 1.0.0
 */
export const condemn: <E, A>(self: These<E, A>) => Either<E, A> = toEither((
  e,
  _
) => E.left(e))

/**
 * @category lifting
 * @since 1.0.0
 */
export const liftNullable = <A extends ReadonlyArray<unknown>, B, E>(
  f: (...a: A) => B | null | undefined,
  onNullable: E
) => (...a: A): These<E, NonNullable<B>> => fromNullable(onNullable)(f(...a))

/**
 * @category sequencing
 * @since 1.0.0
 */
export const flatMapNullable = <A, B, E2>(
  f: (a: A) => B | null | undefined,
  onNullable: E2
): (<E1>(self: Validated<E1, A>) => Validated<E1 | E2, NonNullable<B>>) =>
  flatMap(liftNullable(f, chunk.make(onNullable)))

/**
 * @category lifting
 * @since 1.0.0
 */
export const liftPredicate: {
  <C extends A, B extends A, E, A = C>(
    refinement: Refinement<A, B>,
    onFalse: E
  ): (c: C) => These<E, B>
  <B extends A, E, A = B>(predicate: Predicate<A>, onFalse: E): (b: B) => These<E, B>
} = <B extends A, E, A = B>(predicate: Predicate<A>, onFalse: E) =>
  (b: B) => predicate(b) ? right(b) : left(onFalse)

/**
 * @category conversions
 * @since 1.0.0
 */
export const fromIterable = <E>(onEmpty: E) =>
  <A>(collection: Iterable<A>): These<E, A> => {
    for (const a of collection) {
      return right(a)
    }
    return left(onEmpty)
  }

/**
 * @category conversions
 * @since 1.0.0
 */
export const fromOption = <E>(onNone: E) =>
  <A>(self: Option<A>): These<E, A> => O.isNone(self) ? left(onNone) : right(self.value)

/**
 * @category conversions
 * @since 1.0.0
 */
export const fromTuple = <E, A>(self: readonly [E, A]): These<E, A> => both(self[0], self[1])

/**
 * @category lifting
 * @since 1.0.0
 */
export const liftOption = <A extends ReadonlyArray<unknown>, B, E>(
  f: (...a: A) => Option<B>,
  onNone: E
) => (...a: A): These<E, B> => fromOption(onNone)(f(...a))

/**
 * @category lifting
 * @since 1.0.0
 */
export const liftEither = <A extends ReadonlyArray<unknown>, E, B>(
  f: (...a: A) => Either<E, B>
) => (...a: A): Validated<E, B> => fromEither(f(...a))

/**
 * @category lifting
 * @since 1.0.0
 */
export const liftThese = <A extends ReadonlyArray<unknown>, E, B>(
  f: (...a: A) => These<E, B>
) => (...a: A): Validated<E, B> => fromThese(f(...a))

/**
 * @category sequencing
 * @since 1.0.0
 */
export const flatMapOption = <A, B, E2>(
  f: (a: A) => Option<B>,
  onNone: E2
) =>
  <E1>(self: Validated<E1, A>): Validated<E1 | E2, B> =>
    pipe(self, flatMap(liftOption(f, chunk.make(onNone))))

/**
 * @category sequencing
 * @since 1.0.0
 */
export const flatMapEither = <A, E2, B>(
  f: (a: A) => Either<E2, B>
) => <E1>(self: Validated<E1, A>): Validated<E1 | E2, B> => pipe(self, flatMap(liftEither(f)))

/**
 * @category sequencing
 * @since 1.0.0
 */
export const flatMapThese = <A, E2, B>(
  f: (a: A) => These<E2, B>
) => <E1>(self: Validated<E1, A>): Validated<E1 | E2, B> => pipe(self, flatMap(liftThese(f)))

/**
 * @category getters
 * @since 1.0.0
 */
export const getRight = <E, A>(
  self: These<E, A>
): Option<A> => isLeft(self) ? O.none : O.some(self.right)

/**
 * Returns the `A` value if and only if the value is constructed with `Right`
 *
 * @category getters
 * @since 1.0.0
 */
export const getRightOnly = <E, A>(
  self: These<E, A>
): Option<A> => isRight(self) ? O.some(self.right) : O.none

/**
 * @category getters
 * @since 1.0.0
 */
export const getLeft = <E, A>(
  self: These<E, A>
): Option<E> => isRight(self) ? O.none : O.some(self.left)

/**
 * Returns the `E` value if and only if the value is constructed with `Left`
 *
 * @category getters
 * @since 1.0.0
 */
export const getLeftOnly = <E, A>(
  self: These<E, A>
): Option<E> => isLeft(self) ? O.some(self.left) : O.none

/**
 * @category getters
 * @since 1.0.0
 */
export const getBoth = <E, A>(
  self: These<E, A>
): Option<readonly [E, A]> => isBoth(self) ? O.some([self.left, self.right]) : O.none

/**
 * @category getters
 * @since 1.0.0
 */
export const getBothOrElse = <E, A>(e: E, a: A) =>
  (
    self: These<E, A>
  ): readonly [E, A] =>
    isLeft(self) ?
      [self.left, a] :
      isRight(self) ?
      [e, self.right] :
      [self.left, self.right]

/**
 * @category getters
 * @since 1.0.0
 */
export const getOrElse = <B>(onLeft: B) =>
  <E, A>(self: These<E, A>): A | B => isLeft(self) ? onLeft : self.right

/**
 * @category getters
 * @since 1.0.0
 */
export const getOrNull: <E, A>(self: These<E, A>) => A | null = getOrElse(null)

/**
 * @category getters
 * @since 1.0.0
 */
export const getOrUndefined: <E, A>(self: These<E, A>) => A | undefined = getOrElse(undefined)

/**
 * @category debugging
 * @since 1.0.0
 */
export const inspectRight = <A>(
  onRight: (a: A) => void
) =>
  <E>(self: These<E, A>): These<E, A> => {
    if (isRight(self)) {
      onRight(self.right)
    }
    return self
  }

/**
 * @category debugging
 * @since 1.0.0
 */
export const inspectRightOrBoth = <A>(
  onRightOrBoth: (a: A) => void
) =>
  <E>(self: These<E, A>): These<E, A> => {
    if (isRightOrBoth(self)) {
      onRightOrBoth(self.right)
    }
    return self
  }

/**
 * @category debugging
 * @since 1.0.0
 */
export const inspectLeft = <E>(
  onLeft: (e: E) => void
) =>
  <A>(self: These<E, A>): These<E, A> => {
    if (isLeft(self)) {
      onLeft(self.left)
    }
    return self
  }

/**
 * @category debugging
 * @since 1.0.0
 */
export const inspectBoth = <E, A>(
  onBoth: (e: E, a: A) => void
) =>
  (self: These<E, A>): These<E, A> => {
    if (isBoth(self)) {
      onBoth(self.left, self.right)
    }
    return self
  }

/**
 * Returns an effect whose left and right channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @category mapping
 * @since 1.0.0
 */
export const bimap: <E, G, A, B>(
  f: (e: E) => G,
  g: (a: A) => B
) => (self: These<E, A>) => These<G, B> = (f, g) =>
  (fa) =>
    isLeft(fa) ?
      left(f(fa.left)) :
      isRight(fa) ?
      right(g(fa.right)) :
      both(f(fa.left), g(fa.right))

/**
 * @category instances
 * @since 1.0.0
 */
export const Bicovariant: bicovariant.Bicovariant<TheseTypeLambda> = {
  bimap
}

/**
 * Returns an effect with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger" error.
 *
 * @category error handling
 * @since 1.0.0
 */
export const mapLeft: <E, G>(f: (e: E) => G) => <A>(self: These<E, A>) => These<G, A> = bicovariant
  .mapLeft(Bicovariant)

/**
 * @category conversions
 * @since 1.0.0
 */
export const fromThese: <E, A>(self: These<E, A>) => Validated<E, A> = mapLeft(chunk.make)

/**
 * Returns an effect whose right is mapped by the specified `f` function.
 *
 * @category mapping
 * @since 1.0.0
 */
export const map: <A, B>(f: (a: A) => B) => <E>(self: These<E, A>) => These<E, B> = bicovariant.map(
  Bicovariant
)

/**
 * @category instances
 * @since 1.0.0
 */
export const Covariant: covariant.Covariant<TheseTypeLambda> = covariant.make(map)

/**
 * @category mapping
 * @since 1.0.0
 */
export const imap: <A, B>(
  to: (a: A) => B,
  from: (b: B) => A
) => <E>(self: These<E, A>) => These<E, B> = Covariant.imap

/**
 * @category instances
 * @since 1.0.0
 */
export const Invariant: invariant.Invariant<TheseTypeLambda> = {
  imap
}

/**
 * @category mapping
 * @since 1.0.0
 */
export const tupled: <E, A>(self: These<E, A>) => These<E, readonly [A]> = invariant.tupled(
  Invariant
)

/**
 * @category do notation
 * @since 1.0.0
 */
export const bindTo: <N extends string>(
  name: N
) => <E, A>(self: These<E, A>) => These<E, { readonly [K in N]: A }> = invariant.bindTo(Invariant)

/**
 * @category mapping
 * @since 1.0.0
 */
export const flap: <A>(a: A) => <E, B>(self: These<E, (a: A) => B>) => These<E, B> = covariant
  .flap(
    Covariant
  )

/**
 * Maps the right value of this effect to the specified constant value.
 *
 * @category mapping
 * @since 1.0.0
 */
export const as: <B>(b: B) => <E, _>(self: These<E, _>) => These<E, B> = covariant.as(
  Covariant
)

/**
 * Returns the effect resulting from mapping the right of this effect to unit.
 *
 * @category mapping
 * @since 1.0.0
 */
export const asUnit: <E, _>(self: These<E, _>) => These<E, void> = covariant.asUnit(Covariant)

const let_: <N extends string, A extends object, B>(
  name: Exclude<N, keyof A>,
  f: (a: A) => B
) => <E>(
  self: These<E, A>
) => These<E, { readonly [K in N | keyof A]: K extends keyof A ? A[K] : B }> = covariant.let(
  Covariant
)

export {
  /**
   * @category do notation
   * @since 1.0.0
   */
  let_ as let
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Of: of_.Of<TheseTypeLambda> = {
  of
}

/**
 * @since 1.0.0
 */
export const unit: These<never, void> = of_.unit(Of)

/**
 * @category do notation
 * @since 1.0.0
 */
export const Do: These<never, {}> = of_.Do(Of)

/**
 * @category instances
 * @since 1.0.0
 */
export const Pointed: pointed.Pointed<TheseTypeLambda> = {
  ...Of,
  ...Covariant
}

/**
 * @category traversing
 * @since 1.0.0
 */
export const traverse = <F extends TypeLambda>(
  F: applicative.Applicative<F>
) =>
  <A, R, O, FE, B>(
    f: (a: A) => Kind<F, R, O, FE, B>
  ) =>
    <E>(self: These<E, A>): Kind<F, R, O, FE, These<E, B>> =>
      isLeft(self)
        ? F.of<These<E, B>>(self)
        : isRight(self)
        ? pipe(f(self.right), F.map<B, These<E, B>>(right))
        : pipe(
          f(self.right),
          F.map((b) => both(self.left, b))
        )

/**
 * @category traversing
 * @since 1.0.0
 */
export const sequence: <F extends TypeLambda>(
  F: applicative.Applicative<F>
) => <E, FR, FO, FE, A>(
  self: These<E, Kind<F, FR, FO, FE, A>>
) => Kind<F, FR, FO, FE, These<E, A>> = traversable.sequence<TheseTypeLambda>(traverse)

/**
 * @category instances
 * @since 1.0.0
 */
export const Traversable: traversable.Traversable<TheseTypeLambda> = {
  traverse,
  sequence
}

/**
 * @category traversing
 * @since 1.0.0
 */
export const traverseTap: <F extends TypeLambda>(
  F: applicative.Applicative<F>
) => <A, R, O, E, B>(
  f: (a: A) => Kind<F, R, O, E, B>
) => <TE>(self: These<TE, A>) => Kind<F, R, O, E, These<TE, A>> = traversable
  .traverseTap(Traversable)

/**
 * @category predicates
 * @since 1.0.0
 */
export const elem = <B>(b: B) =>
  <E, A>(self: These<E, A>): boolean => isLeft(self) ? false : equals(self.right)(b)

/**
 * @category predicates
 * @since 1.0.0
 */
export const exists = <A>(predicate: Predicate<A>) =>
  <E>(self: These<E, A>): boolean => isLeft(self) ? false : predicate(self.right)

/**
 * @category instances
 * @since 1.0.0
 */
export const Foldable: foldable.Foldable<TheseTypeLambda> = {
  reduce: (b, f) => (self) => isLeft(self) ? b : f(b, self.right)
}

/**
 * Recovers from all errors.
 *
 * @category error handling
 * @since 1.0.0
 */
export const catchAll = <E1, E2, B>(
  onLeft: (e: E1) => These<E2, B>
) => <A>(self: These<E1, A>): These<E1 | E2, A | B> => isLeft(self) ? onLeft(self.left) : self

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * executes the specified effect.
 *
 * @category error handling
 * @since 1.0.0
 */
export const orElse = <E2, B>(
  that: These<E2, B>
) => <E1, A>(self: These<E1, A>): These<E1 | E2, A | B> => isLeft(self) ? that : self

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 *
 * @category error handling
 * @since 1.0.0
 */
export const orElseEither = <E2, B>(
  that: These<E2, B>
) =>
  <E1, A>(self: These<E1, A>): These<E1 | E2, Either<A, B>> =>
    isLeft(self) ?
      pipe(that, map(E.right)) :
      pipe(self, map(E.left))

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * fails with the specified error.
 *
 * @category error handling
 * @since 1.0.0
 */
export const orElseFail = <E2>(
  onLeft: E2
): <E1, A>(self: These<E1, A>) => These<E1 | E2, A> => orElse(left(onLeft))

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * succeeds with the specified value.
 *
 * @category error handling
 * @since 1.0.0
 */
export const orElseSucceed = <B>(
  onLeft: B
): <E, A>(self: These<E, A>) => These<E, A | B> => orElse(right(onLeft))

/**
 * @category error handling
 * @since 1.0.0
 */
export const firstRightOrBothOf = <E, A>(collection: Iterable<These<E, A>>) =>
  (self: These<E, A>): These<E, A> => {
    let out = self
    if (isRightOrBoth(out)) {
      return out
    }
    for (out of collection) {
      if (isRightOrBoth(out)) {
        return out
      }
    }
    return out
  }

/**
 * @category instances
 * @since 1.0.0
 */
export const SemiCoproduct: semiCoproduct.SemiCoproduct<TheseTypeLambda> = {
  ...Invariant,
  coproduct: (that) => (self) => isRightOrBoth(self) ? self : that,
  coproductMany: firstRightOrBothOf
}

/**
 * @category combining
 * @since 1.0.0
 */
export const getFirstRightOrBothSemigroup: <E, A>() => Semigroup<These<E, A>> = semiCoproduct
  .getSemigroup(SemiCoproduct)

/**
 * @category instances
 * @since 1.0.0
 */
export const SemiAlternative: semiAlternative.SemiAlternative<TheseTypeLambda> = {
  ...Covariant,
  ...SemiCoproduct
}

/**
 * @category filtering
 * @since 1.0.0
 */
export const compact = <E>(onNone: E) =>
  <A>(self: These<E, Option<A>>): These<E, A> =>
    isLeft(self) ?
      self :
      O.isNone(self.right) ?
      left(onNone) :
      isBoth(self) ?
      both(self.left, self.right.value) :
      right(self.right.value)

/**
 * @category filtering
 * @since 1.0.0
 */
export const filter: {
  <C extends A, B extends A, E2, A = C>(refinement: Refinement<A, B>, onFalse: E2): <E1>(
    self: These<E1, C>
  ) => These<E1 | E2, B>
  <B extends A, E2, A = B>(
    predicate: Predicate<A>,
    onFalse: E2
  ): <E1>(self: These<E1, B>) => These<E1 | E2, B>
} = <A, E>(
  predicate: Predicate<A>,
  onFalse: E
) =>
  (self: These<E, A>): These<E, A> =>
    isLeft(self) ? self : predicate(self.right) ? self : left(onFalse)

/**
 * @category filtering
 * @since 1.0.0
 */
export const filterMap = <A, B, E2>(
  f: (a: A) => Option<B>,
  onNone: E2
) =>
  <E1>(self: These<E1, A>): These<E1 | E2, B> => {
    if (isLeft(self)) {
      return self
    }
    if (isRight(self)) {
      const ob = f(self.right)
      return O.isNone(ob) ? left(onNone) : right(ob.value)
    }
    const ob = f(self.right)
    return O.isNone(ob) ? left(onNone) : both(self.left, ob.value)
  }

/**
 * @since 1.0.0
 */
export const product = <E2, B>(that: Validated<E2, B>) =>
  <E1, A>(
    self: Validated<E1, A>
  ): Validated<E1 | E2, readonly [A, B]> => {
    if (isLeft(self)) {
      return self
    }
    if (isRight(self)) {
      if (isLeft(that)) {
        return that
      }
      if (isRight(that)) {
        return right([self.right, that.right])
      }
      return both(that.left, [self.right, that.right])
    }
    if (isLeft(that)) {
      return left(chunk.concat(self.left)(that.left))
    }
    if (isRight(that)) {
      return both(self.left, [self.right, that.right])
    }
    return both(chunk.concat(self.left)(that.left), [self.right, that.right])
  }

/**
 * @since 1.0.0
 */
export const productMany = <E, A>(
  collection: Iterable<Validated<E, A>>
) =>
  (
    self: Validated<E, A>
  ): Validated<E, readonly [A, ...Array<A>]> =>
    pipe(self, product(productAll(collection)), map(([a, as]) => [a, ...as]))

/**
 * @category instances
 * @since 1.0.0
 */
export const SemiProduct: semiProduct.SemiProduct<ValidatedTypeLambda> = {
  imap,
  product,
  productMany
}

/**
 * @category instances
 * @since 1.0.0
 */
export const SemiApplicative: semiApplicative.SemiApplicative<ValidatedTypeLambda> = {
  map,
  ...SemiProduct
}

/**
 * @category lifting
 * @since 1.0.0
 */
export const lift2: <A, B, C>(
  f: (a: A, b: B) => C
) => <E1, E2>(
  fa: Validated<E1, A>,
  fb: Validated<E2, B>
) => Validated<E1 | E2, C> = semiApplicative
  .lift2(SemiApplicative)

/**
 * @category lifting
 * @since 1.0.0
 */
export const lift3: <A, B, C, D>(
  f: (a: A, b: B, c: C) => D
) => <E1, E2, E3>(
  fa: Validated<E1, A>,
  fb: Validated<E2, B>,
  fc: Validated<E3, C>
) => Validated<E1 | E2 | E3, D> = semiApplicative.lift3(
  SemiApplicative
)

/**
 * @since 1.0.0
 */
export const ap: <E2, A>(
  fa: Validated<E2, A>
) => <E1, B>(self: Validated<E1, (a: A) => B>) => Validated<E1 | E2, B> = semiApplicative.ap(
  SemiApplicative
)

/**
 * @category combining
 * @since 1.0.0
 */
export const getFirstLeftSemigroup: <A, E>(
  S: Semigroup<A>
) => Semigroup<Validated<E, A>> = semiApplicative
  .liftSemigroup(SemiApplicative)

/**
 * @since 1.0.0
 */
export const productAll = <E, A>(
  collection: Iterable<Validated<E, A>>
): Validated<E, ReadonlyArray<A>> => {
  const rights: Array<A> = []
  let lefts: chunk.Chunk<E> = chunk.empty
  let isFatal = false
  for (const t of collection) {
    if (isLeft(t)) {
      lefts = chunk.concat(t.left)(lefts)
      isFatal = true
      break
    } else if (isRight(t)) {
      rights.push(t.right)
    } else {
      lefts = chunk.concat(t.left)(lefts)
      rights.push(t.right)
    }
  }
  if (chunk.isNonEmpty(lefts)) {
    return isFatal ? left(lefts) : both(lefts, rights)
  }
  return right(rights)
}

/**
 * @category do notation
 * @since 1.0.0
 */
export const andThenBind: <N extends string, A extends object, E2, B>(
  name: Exclude<N, keyof A>,
  fb: Validated<E2, B>
) => <E1>(
  self: Validated<E1, A>
) => Validated<E1 | E2, { readonly [K in N | keyof A]: K extends keyof A ? A[K] : B }> = semiProduct
  .andThenBind(SemiProduct)

/**
 * @category do notation
 * @since 1.0.0
 */
export const andThenBindEither = <N extends string, A extends object, E2, B>(
  name: Exclude<N, keyof A>,
  fb: Either<E2, B>
): <E1>(
  self: Validated<E1, A>
) => Validated<E1 | E2, { readonly [K in N | keyof A]: K extends keyof A ? A[K] : B }> =>
  andThenBind(name, fromEither(fb))

/**
 * @category do notation
 * @since 1.0.0
 */
export const andThenBindThese = <N extends string, A extends object, E2, B>(
  name: Exclude<N, keyof A>,
  fb: These<E2, B>
): <E1>(
  self: Validated<E1, A>
) => Validated<E1 | E2, { readonly [K in N | keyof A]: K extends keyof A ? A[K] : B }> =>
  andThenBind(name, fromThese(fb))

/**
 * @since 1.0.0
 */
export const productFlatten: <E2, B>(
  that: Validated<E2, B>
) => <E1, A extends ReadonlyArray<any>>(
  self: Validated<E1, A>
) => Validated<E1 | E2, readonly [...A, B]> = semiProduct
  .productFlatten(SemiProduct)

/**
 * @category instances
 * @since 1.0.0
 */
export const Product: product_.Product<ValidatedTypeLambda> = {
  ...SemiProduct,
  of,
  productAll
}

/**
 * @since 1.0.0
 */
export const tuple: <T extends ReadonlyArray<Validated<any, any>>>(
  ...tuple: T
) => Validated<
  [T[number]] extends [Validated<infer E, any>] ? E : never,
  Readonly<{ [I in keyof T]: [T[I]] extends [Validated<any, infer A>] ? A : never }>
> = product_
  .tuple(Product)

/**
 * @since 1.0.0
 */
export const struct: <R extends Record<string, Validated<any, any>>>(
  r: R
) => Validated<
  [R[keyof R]] extends [Validated<infer E, any>] ? E : never,
  { readonly [K in keyof R]: [R[K]] extends [Validated<any, infer A>] ? A : never }
> = product_
  .struct(Product)

/**
 * @category sequencing
 * @since 1.0.0
 */
export const flatMap = <A, E2, B>(
  f: (a: A) => Validated<E2, B>
) =>
  <E1>(self: Validated<E1, A>): Validated<E1 | E2, B> => {
    if (isLeft(self)) {
      return self
    }
    if (isRight(self)) {
      return f(self.right)
    }
    const that = f(self.right)
    if (isLeft(that)) {
      return left(chunk.concat(self.left)(that.left))
    }
    if (isRight(that)) {
      return both(self.left, that.right)
    }
    return both(chunk.concat(self.left)(that.left), that.right)
  }

/**
 * @category instances
 * @since 1.0.0
 */
export const Applicative: applicative.Applicative<ValidatedTypeLambda> = {
  ...SemiApplicative,
  ...Product
}

/**
 * @category combining
 * @since 1.0.0
 */
export const getFirstLeftMonoid: <A, E>(M: Monoid<A>) => Monoid<Validated<E, A>> = applicative
  .liftMonoid(
    Applicative
  )

/**
 * @category instances
 * @since 1.0.0
 */
export const FlatMap: flatMap_.FlatMap<ValidatedTypeLambda> = {
  flatMap
}

/**
 * @since 1.0.0
 */
export const flatten: <E2, E1, A>(
  self: Validated<E2, Validated<E1, A>>
) => Validated<E2 | E1, A> = flatMap_
  .flatten(FlatMap)

/**
 * @since 1.0.0
 */
export const andThen: <E2, B>(
  that: Validated<E2, B>
) => <E1, _>(
  self: Validated<E1, _>
) => Validated<E1 | E2, B> = flatMap_
  .andThen(FlatMap)

/**
 * @since 1.0.0
 */
export const composeKleisliArrow: <B, E2, C>(
  bfc: (b: B) => Validated<E2, C>
) => <A, E1>(
  afb: (a: A) => Validated<E1, B>
) => (a: A) => Validated<E1 | E2, C> = flatMap_
  .composeKleisliArrow(FlatMap)

/**
 * @category instances
 * @since 1.0.0
 */
export const Chainable: chainable.Chainable<ValidatedTypeLambda> = {
  imap,
  map,
  flatMap
}

/**
 * @category do notation
 * @since 1.0.0
 */
export const bind: <N extends string, A extends object, E2, B>(
  name: Exclude<N, keyof A>,
  f: (a: A) => Validated<E2, B>
) => <E1>(
  self: Validated<E1, A>
) => Validated<E1 | E2, { readonly [K in keyof A | N]: K extends keyof A ? A[K] : B }> = chainable
  .bind(Chainable)

/**
 * @category do notation
 * @since 1.0.0
 */
export const bindEither = <N extends string, A extends object, E2, B>(
  name: Exclude<N, keyof A>,
  f: (a: A) => Either<E2, B>
): <E1>(
  self: Validated<E1, A>
) => Validated<E1 | E2, { readonly [K in keyof A | N]: K extends keyof A ? A[K] : B }> =>
  bind(name, (a) => fromEither(f(a)))

/**
 * @category do notation
 * @since 1.0.0
 */
export const bindThese = <N extends string, A extends object, E2, B>(
  name: Exclude<N, keyof A>,
  f: (a: A) => These<E2, B>
): <E1>(
  self: Validated<E1, A>
) => Validated<E1 | E2, { readonly [K in keyof A | N]: K extends keyof A ? A[K] : B }> =>
  bind(name, (a) => fromThese(f(a)))

/**
 * Sequences the specified effect after this effect, but ignores the value
 * produced by the effect.
 *
 * @category sequencing
 * @since 1.0.0
 */
export const andThenDiscard: <E2, _>(
  that: Validated<E2, _>
) => <E1, A>(self: Validated<E1, A>) => Validated<E1 | E2, A> = chainable
  .andThenDiscard(Chainable)

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 *
 * @since 1.0.0
 */
export const tap: <A, E2, _>(
  f: (a: A) => Validated<E2, _>
) => <E1>(self: Validated<E1, A>) => Validated<E1 | E2, A> = chainable.tap(
  Chainable
)

/**
 * @category instances
 * @since 1.0.0
 */
export const Monad: monad.Monad<ValidatedTypeLambda> = {
  imap,
  map,
  of,
  flatMap
}
