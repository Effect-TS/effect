/**
 * @since 1.0.0
 */
import type { Monoid } from "@effect/typeclass/Monoid"
import type { SemiCoproduct } from "@effect/typeclass/SemiCoproduct"
import * as semiCoproduct from "@effect/typeclass/SemiCoproduct"
import type { Kind, TypeLambda } from "effect/HKT"

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
