/**
 * @since 1.0.0
 */
import type { TypeLambda } from "effect/HKT"
import type { Covariant } from "./Covariant"
import type { Of } from "./Of"

/**
 * @category type class
 * @since 1.0.0
 */
export interface Pointed<F extends TypeLambda> extends Covariant<F>, Of<F> {}
