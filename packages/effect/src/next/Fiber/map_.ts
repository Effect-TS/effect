import { Fiber, Syntetic } from "./fiber"
import { map } from "./map"

/**
 * Maps over the value the fiber computes.
 */
export const map_ = <E, A, B>(fiber: Fiber<E, A>, f: (a: A) => B): Syntetic<E, B> =>
  map(f)(fiber)
