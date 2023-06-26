/**
 * @since 1.0.0
 */
import type { TypeLambda } from "@effect/data/HKT"
import type { FlatMap } from "@effect/typeclass/FlatMap"
import type { Pointed } from "@effect/typeclass/Pointed"

/**
 * @category type class
 * @since 1.0.0
 */
export interface Monad<F extends TypeLambda> extends FlatMap<F>, Pointed<F> {}
