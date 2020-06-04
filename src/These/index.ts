/* adapted from https://github.com/gcanti/fp-ts */

import type {
  HKT,
  CMonad2C,
  CTraverse2,
  CApplicative,
  CSequence2,
  CFunctor2,
  CBifunctor2,
  CFoldable2,
  CTraversable2,
  CApplicative2C,
  Traverse2,
  Monad2C,
  Functor2,
  Bifunctor2,
  Foldable2,
  Traversable2,
  Applicative
} from "../Base"
import * as E from "../Either"
import * as Eq from "../Eq"
import { pipe } from "../Function"
import type { Monoid } from "../Monoid"
import * as O from "../Option"
import type { Semigroup } from "../Semigroup"
import type { Show } from "../Show"

export interface Both<E, A> {
  readonly _tag: "Both"
  readonly left: E
  readonly right: A
}

export type These<E, A> = E.Either<E, A> | Both<E, A>

export function both<E, A>(left: E, right: A): These<E, A> {
  return { _tag: "Both", left, right }
}

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

export function left<E = never, A = never>(left: E): These<E, A> {
  return { _tag: "Left", left }
}

export function right<E = never, A = never>(right: A): These<E, A> {
  return { _tag: "Right", right }
}

export const swap: <E, A>(fa: These<E, A>) => These<A, E> =
  /*#__PURE__*/
  (fa) => fold(right, left, (e, a) => both(a, e))(fa) as any

export const URI = "@matechs/core/These"

export type URI = typeof URI

declare module "../Base/HKT" {
  interface URItoKind2<E, A> {
    readonly [URI]: These<E, A>
  }
}

export function getShow<E, A>(SE: Show<E>, SA: Show<A>): Show<These<E, A>> {
  return {
    show: fold(
      (l) => `left(${SE.show(l)})`,
      (a) => `right(${SA.show(a)})`,
      (l, a) => `both(${SE.show(l)}, ${SA.show(a)})`
    )
  }
}

export function getEq<E, A>(EE: Eq.Eq<E>, EA: Eq.Eq<A>): Eq.Eq<These<E, A>> {
  return Eq.fromEquals((x, y) =>
    isLeft(x)
      ? isLeft(y) && EE.equals(x.left, y.left)
      : isRight(x)
      ? isRight(y) && EA.equals(x.right, y.right)
      : isBoth(y) && EE.equals(x.left, y.left) && EA.equals(x.right, y.right)
  )
}

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

export function getMonad<E>(
  S: Semigroup<E>
): CMonad2C<URI, E> & CApplicative2C<URI, E> {
  const chain = <A, B>(
    f: (a: A) => These<E, B>
  ): ((ma: These<E, A>) => These<E, B>) => {
    return (ma) => {
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
  }

  return {
    URI,
    _E: undefined as any,
    map,
    of: right,
    ap: (ma) => chain((f) => map(f)(ma)),
    chain
  }
}

/**
 * @example
 * import { toTuple, left, right, both } from '@matechs/core/These'
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

/**
 * Returns an `E` value if possible
 *
 * @example
 * import { getLeft, left, right, both } from '@matechs/core/These'
 * import { none, some } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(getLeft(left('a')), some('a'))
 * assert.deepStrictEqual(getLeft(right(1)), none)
 * assert.deepStrictEqual(getLeft(both('a', 1)), some('a'))
 */
export function getLeft<E, A>(fa: These<E, A>): O.Option<E> {
  return isLeft(fa) ? O.some(fa.left) : isRight(fa) ? O.none : O.some(fa.left)
}

/**
 * Returns an `A` value if possible
 *
 * @example
 * import { getRight, left, right, both } from '@matechs/core/These'
 * import { none, some } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(getRight(left('a')), none)
 * assert.deepStrictEqual(getRight(right(1)), some(1))
 * assert.deepStrictEqual(getRight(both('a', 1)), some(1))
 */
export function getRight<E, A>(fa: These<E, A>): O.Option<A> {
  return isLeft(fa) ? O.none : isRight(fa) ? O.some(fa.right) : O.some(fa.right)
}

/**
 * Returns `true` if the these is an instance of `Left`, `false` otherwise
 */
export function isLeft<E, A>(fa: These<E, A>): fa is E.Left<E> {
  return fa._tag === "Left"
}

/**
 * Returns `true` if the these is an instance of `Right`, `false` otherwise
 */
export function isRight<E, A>(fa: These<E, A>): fa is E.Right<A> {
  return fa._tag === "Right"
}

/**
 * Returns `true` if the these is an instance of `Both`, `false` otherwise
 */
export function isBoth<E, A>(fa: These<E, A>): fa is Both<E, A> {
  return fa._tag === "Both"
}

/**
 * @example
 * import { leftOrBoth, left, both } from '@matechs/core/These'
 * import { none, some } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(leftOrBoth('a')(none), left('a'))
 * assert.deepStrictEqual(leftOrBoth('a')(some(1)), both('a', 1))
 */
export function leftOrBoth<E>(e: E): <A>(ma: O.Option<A>) => These<E, A> {
  return (ma) => (O.isNone(ma) ? left(e) : both(e, ma.value))
}

/**
 * @example
 * import { rightOrBoth, right, both } from '@matechs/core/These'
 * import { none, some } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(rightOrBoth(1)(none), right(1))
 * assert.deepStrictEqual(rightOrBoth(1)(some('a')), both('a', 1))
 */
export function rightOrBoth<A>(a: A): <E>(me: O.Option<E>) => These<E, A> {
  return (me) => (O.isNone(me) ? right(a) : both(me.value, a))
}

/**
 * Returns the `E` value if and only if the value is constructed with `Left`
 *
 * @example
 * import { getLeftOnly, left, right, both } from '@matechs/core/These'
 * import { none, some } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(getLeftOnly(left('a')), some('a'))
 * assert.deepStrictEqual(getLeftOnly(right(1)), none)
 * assert.deepStrictEqual(getLeftOnly(both('a', 1)), none)
 */
export function getLeftOnly<E, A>(fa: These<E, A>): O.Option<E> {
  return isLeft(fa) ? O.some(fa.left) : O.none
}

/**
 * Returns the `A` value if and only if the value is constructed with `Right`
 *
 * @example
 * import { getRightOnly, left, right, both } from '@matechs/core/These'
 * import { none, some } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(getRightOnly(left('a')), none)
 * assert.deepStrictEqual(getRightOnly(right(1)), some(1))
 * assert.deepStrictEqual(getRightOnly(both('a', 1)), none)
 */
export function getRightOnly<E, A>(fa: These<E, A>): O.Option<A> {
  return isRight(fa) ? O.some(fa.right) : O.none
}

/**
 * Takes a pair of `Option`s and attempts to create a `These` from them
 *
 * @example
 * import { fromOptions, left, right, both } from '@matechs/core/These'
 * import { none, some } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(fromOptions(none, none), none)
 * assert.deepStrictEqual(fromOptions(some('a'), none), some(left('a')))
 * assert.deepStrictEqual(fromOptions(none, some(1)), some(right(1)))
 * assert.deepStrictEqual(fromOptions(some('a'), some(1)), some(both('a', 1)))
 */
export function fromOptions<E, A>(
  fe: O.Option<E>,
  fa: O.Option<A>
): O.Option<These<E, A>> {
  return O.isNone(fe)
    ? O.isNone(fa)
      ? O.none
      : O.some(right(fa.value))
    : O.isNone(fa)
    ? O.some(left(fe.value))
    : O.some(both(fe.value, fa.value))
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

export const traverse: CTraverse2<URI> = <F>(F: CApplicative<F>) => <A, B>(
  f: (a: A) => HKT<F, B>
): (<E>(ta: These<E, A>) => HKT<F, These<E, B>>) => {
  return (ta) =>
    isLeft(ta)
      ? F.of(ta)
      : isRight(ta)
      ? pipe(f(ta.right), F.map(right))
      : pipe(
          f(ta.right),
          F.map((b) => both(ta.left, b))
        )
}

export const traverse_: Traverse2<URI> = <F>(F: CApplicative<F>) => <A, B, E>(
  ta: These<E, A>,
  f: (a: A) => HKT<F, B>
): HKT<F, These<E, B>> => {
  return isLeft(ta)
    ? F.of(ta)
    : isRight(ta)
    ? pipe(f(ta.right), F.map(right))
    : pipe(
        f(ta.right),
        F.map((b) => both(ta.left, b))
      )
}

export const sequence: CSequence2<URI> = <F>(F: CApplicative<F>) => <E, A>(
  ta: These<E, HKT<F, A>>
): HKT<F, These<E, A>> => {
  return isLeft(ta)
    ? F.of(ta)
    : isRight(ta)
    ? pipe(ta.right, F.map(right))
    : pipe(
        ta.right,
        F.map((b) => both(ta.left, b))
      )
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

export const these: CFunctor2<URI> &
  CBifunctor2<URI> &
  CFoldable2<URI> &
  CTraversable2<URI> = {
  URI,
  map,
  bimap,
  mapLeft,
  reduce,
  foldMap,
  reduceRight,
  traverse,
  sequence
}

//
// Compatibility with fp-ts ecosystem
//

export const these_: Functor2<URI> &
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
  traverse: <F>(F: Applicative<F>) => <A, B, E>(
    ta: These<E, A>,
    f: (a: A) => HKT<F, B>
  ): HKT<F, These<E, B>> => {
    return isLeft(ta)
      ? F.of(ta)
      : isRight(ta)
      ? F.map(f(ta.right), right)
      : F.map(f(ta.right), (b) => both(ta.left, b))
  },
  sequence: <F>(F: Applicative<F>) => <E, A>(
    ta: These<E, HKT<F, A>>
  ): HKT<F, These<E, A>> => {
    return isLeft(ta)
      ? F.of(ta)
      : isRight(ta)
      ? F.map(ta.right, right)
      : F.map(ta.right, (b) => both(ta.left, b))
  }
}

export function getMonad_<E>(S: Semigroup<E>): Monad2C<URI, E> {
  const chain_ = <A, B>(ma: These<E, A>, f: (a: A) => These<E, B>): These<E, B> => {
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
    map: map_,
    of: right,
    ap: <A, B>(fab: These<E, (a: A) => B>, fa: These<E, A>): These<E, B> =>
      chain_(fab, (f) => map(f)(fa)),
    chain: chain_
  }
}
