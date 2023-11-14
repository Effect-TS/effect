/**
 * @since 1.0.0
 */
import type { Kind, TypeLambda } from "effect/HKT"
import type { Monoid } from "./Monoid.js"
import type { SemiCoproduct } from "./SemiCoproduct.js"
import * as semiCoproduct from "./SemiCoproduct.js"

/**
 * @category type class
 * @since 1.0.0
 */
export interface Coproduct<F extends TypeLambda> extends SemiCoproduct<F> {
  readonly zero: <A>() => Kind<F, unknown, never, never, A>

  readonly coproductAll: <R, O, E, A>(
    collection: Iterable<Kind<F, R, O, E, A>>
  ) => Kind<F, R, O, E, A>
}

/**
 * @since 1.0.0
 */
export const getMonoid = <F extends TypeLambda>(F: Coproduct<F>) =>
<R, O, E, A>(): Monoid<
  Kind<F, R, O, E, A>
> => ({
  ...semiCoproduct.getSemigroup(F)(),
  empty: F.zero(),
  combineAll: F.coproductAll
})
