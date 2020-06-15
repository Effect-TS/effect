import { Fail } from "./cause"
import { chain } from "./chain"

/**
 * Equivalent to chain((a) => Fail(f(a)))
 */
export const map = <E, E1>(f: (e: E) => E1) => chain((e: E) => Fail(f(e)))
