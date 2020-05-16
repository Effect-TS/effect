/**
 * A data structure providing "inclusive-or" as opposed to `Either`'s "exclusive-or".
 *
 * If you interpret `Either<E, A>` as suggesting the computation may either fail or succeed (exclusively), then
 * `These<E, A>` may fail, succeed, or do both at the same time.
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
 * @since 2.0.0
 */

import type { Applicative } from "fp-ts/lib/Applicative"
import type { Bifunctor2 } from "fp-ts/lib/Bifunctor"
import type { Either, Left, Right } from "fp-ts/lib/Either"
import type { Foldable2 } from "fp-ts/lib/Foldable"
import type { Functor2 } from "fp-ts/lib/Functor"
import type { HKT } from "fp-ts/lib/HKT"
import type { Monad2C } from "fp-ts/lib/Monad"
import type { MonadThrow2C } from "fp-ts/lib/MonadThrow"
import type { Semigroup } from "fp-ts/lib/Semigroup"
import type { Show } from "fp-ts/lib/Show"
import type { Traversable2, Traverse2, Sequence2 } from "fp-ts/lib/Traversable"

import { Eq, fromEquals } from "../Eq"
import type { Monoid } from "../Monoid"
import { isNone, none, Option, some } from "../Option"

declare module "fp-ts/lib/HKT" {
  interface URItoKind2<E, A> {
    readonly These: These<E, A>
  }
}

/**
 * @since 2.0.0
 */
export const URI = "These"

/**
 * @since 2.0.0
 */
export type URI = typeof URI

/**
 * @since 2.0.0
 */
export interface Both<E, A> {
  readonly _tag: "Both"
  readonly left: E
  readonly right: A
}

/**
 * @since 2.0.0
 */
export type These<E, A> = Either<E, A> | Both<E, A>

/**
 * @since 2.0.0
 */
export function left<E = never, A = never>(left: E): These<E, A> {
  return { _tag: "Left", left }
}

/**
 * @since 2.0.0
 */
export function right<E = never, A = never>(right: A): These<E, A> {
  return { _tag: "Right", right }
}

/**
 * @since 2.0.0
 */
export function both<E, A>(left: E, right: A): These<E, A> {
  return { _tag: "Both", left, right }
}

/**
 * @since 2.0.0
 */
export function fold<E, A, B>(
  onLeft: (e: E) => B,
  onRight: (a: A) => B,
  onBoth: (e: E, a: A) => B
): (fa: These<E, A>) => B {
  return (fa) => {
    switch (fa._tag) {
      case "Left":
        return onLeft(fa.left)
      case "Right":
        return onRight(fa.right)
      case "Both":
        return onBoth(fa.left, fa.right)
    }
  }
}

/**
 * @since 2.4.0
 */
export const swap: <E, A>(fa: These<E, A>) => These<A, E> = fold(right, left, (e, a) =>
  both(a, e)
)

/**
 * @since 2.0.0
 */
export function getShow<E, A>(SE: Show<E>, SA: Show<A>): Show<These<E, A>> {
  return {
    show: fold(
      (l) => `left(${SE.show(l)})`,
      (a) => `right(${SA.show(a)})`,
      (l, a) => `both(${SE.show(l)}, ${SA.show(a)})`
    )
  }
}

/**
 * @since 2.0.0
 */
export function getEq<E, A>(EE: Eq<E>, EA: Eq<A>): Eq<These<E, A>> {
  return fromEquals((x, y) =>
    isLeft(x)
      ? isLeft(y) && EE.equals(x.left, y.left)
      : isRight(x)
      ? isRight(y) && EA.equals(x.right, y.right)
      : isBoth(y) && EE.equals(x.left, y.left) && EA.equals(x.right, y.right)
  )
}

/**
 * @since 2.0.0
 */
export function getSemigroup<E, A>(
  SE: Semigroup<E>,
  SA: Semigroup<A>
): Semigroup<These<E, A>> {
  return {
    concat: (x, y) =>
      isLeft(x)
        ? isLeft(y)
          ? left(SE.concat(x.left, y.left))
          : isRight(y)
          ? both(x.left, y.right)
          : both(SE.concat(x.left, y.left), y.right)
        : isRight(x)
        ? isLeft(y)
          ? both(y.left, x.right)
          : isRight(y)
          ? right(SA.concat(x.right, y.right))
          : both(y.left, SA.concat(x.right, y.right))
        : isLeft(y)
        ? both(SE.concat(x.left, y.left), x.right)
        : isRight(y)
        ? both(x.left, SA.concat(x.right, y.right))
        : both(SE.concat(x.left, y.left), SA.concat(x.right, y.right))
  }
}

/**
 * @since 2.0.0
 */
export function getMonad<E>(S: Semigroup<E>): Monad2C<URI, E> & MonadThrow2C<URI, E> {
  const chain = <A, B>(ma: These<E, A>, f: (a: A) => These<E, B>): These<E, B> => {
    if (isLeft(ma)) {
      return ma
    }
    if (isRight(ma)) {
      return f(ma.right)
    }
    const fb = f(ma.right)
    return isLeft(fb)
      ? left(S.concat(ma.left, fb.left))
      : isRight(fb)
      ? both(ma.left, fb.right)
      : both(S.concat(ma.left, fb.left), fb.right)
  }

  return {
    URI,
    _E: undefined as any,
    map: these.map,
    of: right,
    ap: (mab, ma) => chain(mab, (f) => these.map(ma, f)),
    chain,
    throwError: left
  }
}

/* tslint:disable:readonly-array */
/**
 * @example
 * import { toTuple, left, right, both } from 'fp-ts/lib/These'
 *
 * assert.deepStrictEqual(toTuple('a', 1)(left('b')), ['b', 1])
 * assert.deepStrictEqual(toTuple('a', 1)(right(2)), ['a', 2])
 * assert.deepStrictEqual(toTuple('a', 1)(both('b', 2)), ['b', 2])
 *
 * @since 2.0.0
 */
export function toTuple<E, A>(e: E, a: A): (fa: These<E, A>) => [E, A] {
  return (fa) =>
    isLeft(fa) ? [fa.left, a] : isRight(fa) ? [e, fa.right] : [fa.left, fa.right]
}
/* tslint:enable:readonly-array */

/**
 * Returns an `E` value if possible
 *
 * @example
 * import { getLeft, left, right, both } from 'fp-ts/lib/These'
 * import { none, some } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(getLeft(left('a')), some('a'))
 * assert.deepStrictEqual(getLeft(right(1)), none)
 * assert.deepStrictEqual(getLeft(both('a', 1)), some('a'))
 *
 * @since 2.0.0
 */
export function getLeft<E, A>(fa: These<E, A>): Option<E> {
  return isLeft(fa) ? some(fa.left) : isRight(fa) ? none : some(fa.left)
}

/**
 * Returns an `A` value if possible
 *
 * @example
 * import { getRight, left, right, both } from 'fp-ts/lib/These'
 * import { none, some } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(getRight(left('a')), none)
 * assert.deepStrictEqual(getRight(right(1)), some(1))
 * assert.deepStrictEqual(getRight(both('a', 1)), some(1))
 *
 * @since 2.0.0
 */
export function getRight<E, A>(fa: These<E, A>): Option<A> {
  return isLeft(fa) ? none : isRight(fa) ? some(fa.right) : some(fa.right)
}

/**
 * Returns `true` if the these is an instance of `Left`, `false` otherwise
 *
 * @since 2.0.0
 */
export function isLeft<E, A>(fa: These<E, A>): fa is Left<E> {
  return fa._tag === "Left"
}

/**
 * Returns `true` if the these is an instance of `Right`, `false` otherwise
 *
 * @since 2.0.0
 */
export function isRight<E, A>(fa: These<E, A>): fa is Right<A> {
  return fa._tag === "Right"
}

/**
 * Returns `true` if the these is an instance of `Both`, `false` otherwise
 *
 * @since 2.0.0
 */
export function isBoth<E, A>(fa: These<E, A>): fa is Both<E, A> {
  return fa._tag === "Both"
}

/**
 * @example
 * import { leftOrBoth, left, both } from 'fp-ts/lib/These'
 * import { none, some } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(leftOrBoth('a')(none), left('a'))
 * assert.deepStrictEqual(leftOrBoth('a')(some(1)), both('a', 1))
 *
 * @since 2.0.0
 */
export function leftOrBoth<E>(e: E): <A>(ma: Option<A>) => These<E, A> {
  return (ma) => (isNone(ma) ? left(e) : both(e, ma.value))
}

/**
 * @example
 * import { rightOrBoth, right, both } from 'fp-ts/lib/These'
 * import { none, some } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(rightOrBoth(1)(none), right(1))
 * assert.deepStrictEqual(rightOrBoth(1)(some('a')), both('a', 1))
 *
 * @since 2.0.0
 */
export function rightOrBoth<A>(a: A): <E>(me: Option<E>) => These<E, A> {
  return (me) => (isNone(me) ? right(a) : both(me.value, a))
}

/**
 * Returns the `E` value if and only if the value is constructed with `Left`
 *
 * @example
 * import { getLeftOnly, left, right, both } from 'fp-ts/lib/These'
 * import { none, some } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(getLeftOnly(left('a')), some('a'))
 * assert.deepStrictEqual(getLeftOnly(right(1)), none)
 * assert.deepStrictEqual(getLeftOnly(both('a', 1)), none)
 *
 * @since 2.0.0
 */
export function getLeftOnly<E, A>(fa: These<E, A>): Option<E> {
  return isLeft(fa) ? some(fa.left) : none
}

/**
 * Returns the `A` value if and only if the value is constructed with `Right`
 *
 * @example
 * import { getRightOnly, left, right, both } from 'fp-ts/lib/These'
 * import { none, some } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(getRightOnly(left('a')), none)
 * assert.deepStrictEqual(getRightOnly(right(1)), some(1))
 * assert.deepStrictEqual(getRightOnly(both('a', 1)), none)
 *
 *
 * @since 2.0.0
 */
export function getRightOnly<E, A>(fa: These<E, A>): Option<A> {
  return isRight(fa) ? some(fa.right) : none
}

/**
 * Takes a pair of `Option`s and attempts to create a `These` from them
 *
 * @example
 * import { fromOptions, left, right, both } from 'fp-ts/lib/These'
 * import { none, some } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(fromOptions(none, none), none)
 * assert.deepStrictEqual(fromOptions(some('a'), none), some(left('a')))
 * assert.deepStrictEqual(fromOptions(none, some(1)), some(right(1)))
 * assert.deepStrictEqual(fromOptions(some('a'), some(1)), some(both('a', 1)))
 *
 * @since 2.0.0
 */
export function fromOptions<E, A>(fe: Option<E>, fa: Option<A>): Option<These<E, A>> {
  return isNone(fe)
    ? isNone(fa)
      ? none
      : some(right(fa.value))
    : isNone(fa)
    ? some(left(fe.value))
    : some(both(fe.value, fa.value))
}

export const map_: <E, A, B>(fa: These<E, A>, f: (a: A) => B) => These<E, B> = (
  fa,
  f
) => (isLeft(fa) ? fa : isRight(fa) ? right(f(fa.right)) : both(fa.left, f(fa.right)))

export const bimap_: <E, A, G, B>(
  fea: These<E, A>,
  f: (e: E) => G,
  g: (a: A) => B
) => These<G, B> = (fea, f, g) =>
  isLeft(fea)
    ? left(f(fea.left))
    : isRight(fea)
    ? right(g(fea.right))
    : both(f(fea.left), g(fea.right))

export const mapLeft_: <E, A, G>(fea: These<E, A>, f: (e: E) => G) => These<G, A> = (
  fea,
  f
) =>
  isLeft(fea) ? left(f(fea.left)) : isBoth(fea) ? both(f(fea.left), fea.right) : fea

export const reduce_: <E, A, B>(fa: These<E, A>, b: B, f: (b: B, a: A) => B) => B = (
  fa,
  b,
  f
) => (isLeft(fa) ? b : isRight(fa) ? f(b, fa.right) : f(b, fa.right))

export const foldMap_: <M>(
  M: Monoid<M>
) => <E, A>(fa: These<E, A>, f: (a: A) => M) => M = (M) => (fa, f) =>
  isLeft(fa) ? M.empty : isRight(fa) ? f(fa.right) : f(fa.right)

export const reduceRight_: <E, A, B>(
  fa: These<E, A>,
  b: B,
  f: (a: A, b: B) => B
) => B = (fa, b, f) => (isLeft(fa) ? b : isRight(fa) ? f(fa.right, b) : f(fa.right, b))

export const traverse: Traverse2<URI> = <F>(F: Applicative<F>) => <E, A, B>(
  ta: These<E, A>,
  f: (a: A) => HKT<F, B>
): HKT<F, These<E, B>> => {
  return isLeft(ta)
    ? F.of(ta)
    : isRight(ta)
    ? F.map(f(ta.right), right)
    : F.map(f(ta.right), (b) => both(ta.left, b))
}

export const sequence: Sequence2<URI> = <F>(F: Applicative<F>) => <E, A>(
  ta: These<E, HKT<F, A>>
): HKT<F, These<E, A>> => {
  return isLeft(ta)
    ? F.of(ta)
    : isRight(ta)
    ? F.map(ta.right, right)
    : F.map(ta.right, (b) => both(ta.left, b))
}
/**
 * @since 2.0.0
 */
export const these: Functor2<URI> &
  Bifunctor2<URI> &
  Foldable2<URI> &
  Traversable2<URI> = {
  URI,
  map: map_,
  bimap: bimap_,
  mapLeft: mapLeft_,
  reduce: reduce_,
  foldMap: foldMap_,
  reduceRight: reduceRight_,
  traverse,
  sequence
}

export const bimap: <E, G, A, B>(
  f: (e: E) => G,
  g: (a: A) => B
) => (fa: These<E, A>) => These<G, B> = (f, g) => (fa) => bimap_(fa, f, g)

export const foldMap: <M>(
  M: Monoid<M>
) => <A>(f: (a: A) => M) => <E>(fa: These<E, A>) => M = (M) => (f) => (fa) =>
  foldMap_(M)(fa, f)

export const map: <A, B>(f: (a: A) => B) => <E>(fa: These<E, A>) => These<E, B> = (
  f
) => (fa) => map_(fa, f)

export const mapLeft: <E, G>(f: (e: E) => G) => <A>(fa: These<E, A>) => These<G, A> = (
  f
) => (fa) => mapLeft_(fa, f)

export const reduce: <A, B>(b: B, f: (b: B, a: A) => B) => <E>(fa: These<E, A>) => B = (
  b,
  f
) => (fa) => reduce_(fa, b, f)

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => <E>(fa: These<E, A>) => B = (b, f) => (fa) => reduceRight_(fa, b, f)
