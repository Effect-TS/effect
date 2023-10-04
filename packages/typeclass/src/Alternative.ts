/**
 * @since 1.0.0
 */
import type { TypeLambda } from "effect/HKT"
import type { Coproduct } from "./Coproduct"
import type { SemiAlternative } from "./SemiAlternative"

/**
 * @category type class
 * @since 1.0.0
 */
export interface Alternative<F extends TypeLambda> extends SemiAlternative<F>, Coproduct<F> {}
