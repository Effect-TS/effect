/**
 * @since 1.0.0
 */
import type { Monoid } from "@effect/typeclass/Monoid"
import * as monoid from "@effect/typeclass/Monoid"
import type { Product } from "@effect/typeclass/Product"
import type { SemiApplicative } from "@effect/typeclass/SemiApplicative"
import * as semiApplicative from "@effect/typeclass/SemiApplicative"
import type { Kind, TypeLambda } from "effect/HKT"

/**
 * @category type class
 * @since 1.0.0
 */
export interface Applicative<F extends TypeLambda> extends SemiApplicative<F>, Product<F> {}

/**
 * Lift a `Monoid` into `F`, combining the inner values using the provided `Monoid`:
 *
 * - `combine` is provided by {@link semiApplicative.getSemigroup}.
 * - `empty` is `F.of(M.empty)`
 *
 * @param F - The `Applicative` instance for `F`.
 * @param M - The `Monoid` instance for `A`.
 *
 * @since 1.0.0
 */
export const getMonoid =
  <F extends TypeLambda>(F: Applicative<F>) =>
  <A, R, O, E>(M: Monoid<A>): Monoid<Kind<F, R, O, E, A>> =>
    monoid.fromSemigroup(
      semiApplicative.getSemigroup(F)<A, R, O, E>(M),
      F.of(M.empty)
    )
