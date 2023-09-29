/**
 * @since 1.0.0
 */
import type { Coproduct } from "@effect/typeclass/Coproduct"
import type { SemiAlternative } from "@effect/typeclass/SemiAlternative"
import type { TypeLambda } from "effect/HKT"

/**
 * @category type class
 * @since 1.0.0
 */
export interface Alternative<F extends TypeLambda> extends SemiAlternative<F>, Coproduct<F> {}
