import { Fiber } from "./fiber"
import { map_ } from "./map_"

/**
 * Maps the output of this fiber to the specified constant.
 */
export const as = <B>(b: B) => <E, A>(fiber: Fiber<E, A>) => map_(fiber, () => b)
