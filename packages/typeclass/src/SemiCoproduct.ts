/**
 * @since 0.24.0
 */

import type { Kind, TypeLambda } from "effect/HKT"
import type { Invariant } from "./Invariant.js"
import type { Semigroup } from "./Semigroup.js"

/**
 * @category type class
 * @since 0.24.0
 */
export interface SemiCoproduct<F extends TypeLambda> extends Invariant<F> {
  readonly coproduct: <R1, O1, E1, A, R2, O2, E2, B>(
    self: Kind<F, R1, O1, E1, A>,
    that: Kind<F, R2, O2, E2, B>
  ) => Kind<F, R1 & R2, O1 | O2, E1 | E2, A | B>

  readonly coproductMany: <R, O, E, A>(
    self: Kind<F, R, O, E, A>,
    collection: Iterable<Kind<F, R, O, E, A>>
  ) => Kind<F, R, O, E, A>
}

/**
 * @since 0.24.0
 */
export const getSemigroup = <F extends TypeLambda>(F: SemiCoproduct<F>) =>
<R, O, E, A>(): Semigroup<
  Kind<F, R, O, E, A>
> => ({
  combine: F.coproduct,
  combineMany: F.coproductMany
})
