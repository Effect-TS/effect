/**
 * @since 1.0.0
 */
import type { TypeLambda } from "effect/HKT"
import type { Covariant } from "./Covariant"
import type { SemiCoproduct } from "./SemiCoproduct"

/**
 * @category type class
 * @since 1.0.0
 */
export interface SemiAlternative<F extends TypeLambda> extends SemiCoproduct<F>, Covariant<F> {}
