/**
 * @since 0.24.0
 */
import type { TypeLambda } from "effect/HKT"
import type { Coproduct } from "./Coproduct.js"
import type { SemiAlternative } from "./SemiAlternative.js"

/**
 * @category type class
 * @since 0.24.0
 */
export interface Alternative<F extends TypeLambda> extends SemiAlternative<F>, Coproduct<F> {}
