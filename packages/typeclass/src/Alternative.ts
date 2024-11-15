/**
 * @since 0.24.0
 */
import type { Kind, TypeLambda } from "effect/HKT"
import type { Applicative } from "./Applicative.js"
import type { Coproduct } from "./Coproduct.js"
import * as monoid from "./Monoid.js"
import type { SemiAlternative } from "./SemiAlternative.js"
import * as semiApplicative from "./SemiApplicative.js"
import * as semigroup from "./Semigroup.js"

/**
 * @category type class
 * @since 0.24.0
 */
export interface Alternative<F extends TypeLambda> extends Applicative<F>, SemiAlternative<F>, Coproduct<F> {}

/**
 * @category lifting
 * @since 0.30.0
 */
export const getAlternativeMonoid = <F extends TypeLambda>(
  F: Alternative<F>
) => {
  const f = semiApplicative.getSemigroup(F)
  return <R, O, E, A>(S: semigroup.Semigroup<A>) => {
    const SF = f<A, R, O, E>(S)
    return monoid.fromSemigroup(
      semigroup.make(
        (first: Kind<F, R, O, E, A>, second: Kind<F, R, O, E, A>) =>
          F.coproduct(SF.combine(first, second), F.coproduct(first, second))
      ),
      F.zero()
    )
  }
}
