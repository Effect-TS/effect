/**
 * @since 1.0.0
 */
import type { TypeLambda } from "effect/HKT"
import type { FlatMap } from "./FlatMap.js"
import type { Pointed } from "./Pointed.js"

/**
 * @category type class
 * @since 1.0.0
 */
export interface Monad<F extends TypeLambda> extends FlatMap<F>, Pointed<F> {}
