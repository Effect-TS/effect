/**
 * @since 1.0.0
 */
import type { Covariant } from "@effect/typeclass/Covariant"
import type { Of } from "@effect/typeclass/Of"
import type { TypeLambda } from "effect/HKT"

/**
 * @category type class
 * @since 1.0.0
 */
export interface Pointed<F extends TypeLambda> extends Covariant<F>, Of<F> {}
