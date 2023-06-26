/**
 * @since 1.0.0
 */
import type { TypeLambda } from "@effect/data/HKT"
import type { Coproduct } from "@effect/typeclass/Coproduct"
import type { SemiAlternative } from "@effect/typeclass/SemiAlternative"

/**
 * @category type class
 * @since 1.0.0
 */
export interface Alternative<F extends TypeLambda> extends SemiAlternative<F>, Coproduct<F> {}
