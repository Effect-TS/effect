/**
 * @since 0.24.0
 */
import type { TypeLambda } from "effect/HKT"
import type { Covariant } from "./Covariant.js"
import type { SemiCoproduct } from "./SemiCoproduct.js"

/**
 * @category type class
 * @since 0.24.0
 */
export interface SemiAlternative<F extends TypeLambda> extends SemiCoproduct<F>, Covariant<F> {}
