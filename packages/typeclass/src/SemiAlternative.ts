/**
 * @since 1.0.0
 */
import type { Covariant } from "@effect/typeclass/Covariant"
import type { SemiCoproduct } from "@effect/typeclass/SemiCoproduct"
import type { TypeLambda } from "effect/HKT"

/**
 * @category type class
 * @since 1.0.0
 */
export interface SemiAlternative<F extends TypeLambda> extends SemiCoproduct<F>, Covariant<F> {}
