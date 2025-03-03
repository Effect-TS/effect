/**
 * @since 0.24.0
 */
import { dual, identity, SK } from "effect/Function"
import type { Kind, TypeLambda } from "effect/HKT"
import type { Covariant } from "./Covariant.js"
import type { Semigroup } from "./Semigroup.js"
import * as semigroup from "./Semigroup.js"
import type { SemiProduct } from "./SemiProduct.js"

/**
 * @category type class
 * @since 0.24.0
 */
export interface SemiApplicative<F extends TypeLambda> extends SemiProduct<F>, Covariant<F> {}

/**
 * Lift a `Semigroup` into 'F', the inner values are combined using the provided `Semigroup`.
 *
 * @category lifting
 * @since 0.24.0
 */
export const getSemigroup =
  <F extends TypeLambda>(F: SemiApplicative<F>) => <A, R, O, E>(S: Semigroup<A>): Semigroup<Kind<F, R, O, E, A>> =>
    semigroup.make(
      (self, that) => F.map(F.product(self, that), ([a1, a2]) => S.combine(a1, a2)),
      (self, collection) => F.map(F.productMany(self, collection), ([head, ...tail]) => S.combineMany(head, tail))
    )

/**
 * Zips two `F` values together using a provided function, returning a new `F` of the result.
 *
 * @since 0.24.0
 */
export const zipWith = <F extends TypeLambda>(F: SemiApplicative<F>): {
  <R2, O2, E2, B, A, C>(
    that: Kind<F, R2, O2, E2, B>,
    f: (a: A, b: B) => C
  ): <R1, O1, E1>(self: Kind<F, R1, O1, E1, A>) => Kind<F, R1 & R2, O2 | O1, E2 | E1, C>
  <R1, O1, E1, A, R2, O2, E2, B, C>(
    self: Kind<F, R1, O1, E1, A>,
    that: Kind<F, R2, O2, E2, B>,
    f: (a: A, b: B) => C
  ): Kind<F, R1 & R2, O1 | O2, E1 | E2, C>
} =>
  dual(
    3,
    <R1, O1, E1, A, R2, O2, E2, B, C>(
      self: Kind<F, R1, O1, E1, A>,
      that: Kind<F, R2, O2, E2, B>,
      f: (a: A, b: B) => C
    ): Kind<F, R1 & R2, O1 | O2, E1 | E2, C> => F.map(F.product(self, that), ([a, b]) => f(a, b))
  )

/**
 * @since 0.24.0
 */
export const ap = <F extends TypeLambda>(F: SemiApplicative<F>): {
  <R2, O2, E2, A>(
    that: Kind<F, R2, O2, E2, A>
  ): <R1, O1, E1, B>(
    self: Kind<F, R1, O1, E1, (a: A) => B>
  ) => Kind<F, R1 & R2, O2 | O1, E2 | E1, B>
  <R1, O1, E1, A, B, R2, O2, E2>(
    self: Kind<F, R1, O1, E1, (a: A) => B>,
    that: Kind<F, R2, O2, E2, A>
  ): Kind<F, R1 & R2, O1 | O2, E1 | E2, B>
} =>
  dual(2, <R1, O1, E1, A, B, R2, O2, E2>(
    self: Kind<F, R1, O1, E1, (a: A) => B>,
    that: Kind<F, R2, O2, E2, A>
  ): Kind<F, R1 & R2, O1 | O2, E1 | E2, B> => zipWith(F)(self, that, (f, a) => f(a)))

/**
 * @since 0.24.0
 */
export const zipLeft = <F extends TypeLambda>(F: SemiApplicative<F>): {
  <R2, O2, E2, _>(
    that: Kind<F, R2, O2, E2, _>
  ): <R1, O1, E1, A>(self: Kind<F, R1, O1, E1, A>) => Kind<F, R1 & R2, O2 | O1, E2 | E1, A>
  <R1, O1, E1, A, R2, O2, E2, _>(
    self: Kind<F, R1, O1, E1, A>,
    that: Kind<F, R2, O2, E2, _>
  ): Kind<F, R1 & R2, O1 | O2, E1 | E2, A>
} =>
  dual(2, <R1, O1, E1, A, R2, O2, E2, _>(
    self: Kind<F, R1, O1, E1, A>,
    that: Kind<F, R2, O2, E2, _>
  ): Kind<F, R1 & R2, O1 | O2, E1 | E2, A> => zipWith(F)(self, that, identity))

/**
 * @since 0.24.0
 */
export const zipRight = <F extends TypeLambda>(F: SemiApplicative<F>): {
  <R2, O2, E2, B>(
    that: Kind<F, R2, O2, E2, B>
  ): <R1, O1, E1, _>(self: Kind<F, R1, O1, E1, _>) => Kind<F, R1 & R2, O2 | O1, E2 | E1, B>
  <R1, O1, E1, _, R2, O2, E2, B>(
    self: Kind<F, R1, O1, E1, _>,
    that: Kind<F, R2, O2, E2, B>
  ): Kind<F, R1 & R2, O1 | O2, E1 | E2, B>
} =>
  dual(2, <R1, O1, E1, _, R2, O2, E2, B>(
    self: Kind<F, R1, O1, E1, _>,
    that: Kind<F, R2, O2, E2, B>
  ): Kind<F, R1 & R2, O1 | O2, E1 | E2, B> => zipWith(F)(self, that, SK))

/**
 * Lifts a binary function into `F`.
 *
 * @category lifting
 * @since 0.24.0
 */
export const lift2 = <F extends TypeLambda>(F: SemiApplicative<F>) =>
<A, B, C>(f: (a: A, b: B) => C): {
  <R2, O2, E2>(
    that: Kind<F, R2, O2, E2, B>
  ): <R1, O1, E1>(self: Kind<F, R1, O1, E1, A>) => Kind<F, R1 & R2, O2 | O1, E2 | E1, C>
  <R1, O1, E1, R2, O2, E2>(
    self: Kind<F, R1, O1, E1, A>,
    that: Kind<F, R2, O2, E2, B>
  ): Kind<F, R1 & R2, O1 | O2, E1 | E2, C>
} =>
  dual(2, <R1, O1, E1, R2, O2, E2>(
    self: Kind<F, R1, O1, E1, A>,
    that: Kind<F, R2, O2, E2, B>
  ): Kind<F, R1 & R2, O1 | O2, E1 | E2, C> => zipWith(F)(self, that, f))
