import { Fiber, Syntetic } from "./fiber"
import { map_ } from "./map_"

/**
 * Maps the output of this fiber to `void`.
 */
export const unit = <E, A>(fiber: Fiber<E, A>): Syntetic<E, void> =>
  map_(fiber, () => undefined)
