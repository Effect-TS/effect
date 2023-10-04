/**
 * @since 1.0.0
 */
import type { Kind, TypeLambda } from "effect/HKT"
import type { Monoid } from "./Monoid"
import * as monoid from "./Monoid"
import type { Product } from "./Product"
import type { SemiApplicative } from "./SemiApplicative"
import * as semiApplicative from "./SemiApplicative"

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
