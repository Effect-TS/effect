import { Sync } from "./effect"
import { ISucceed } from "./primitives"

/**
 * Lift a pure value into an effect
 */
export const succeedNow = <A>(a: A): Sync<A> => new ISucceed(a)
