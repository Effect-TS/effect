/**
 * @since 1.0.0
 */
import type { TypeLambda } from "@effect/data/HKT"
import type { Covariant } from "@effect/typeclass/Covariant"
import type { Of } from "@effect/typeclass/Of"

/**
 * @category type class
 * @since 1.0.0
 */
export interface Pointed<F extends TypeLambda> extends Covariant<F>, Of<F> {}
