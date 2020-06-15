import { Sync } from "./effect"
import { IEffectTotal } from "./primitives"

/**
 * Imports a synchronous side-effect into a pure value
 */
export const effectTotal = <A>(effect: () => A): Sync<A> => new IEffectTotal(effect)
