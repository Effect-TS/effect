import { Fiber, Syntetic } from "./fiber"
import { zipWith_ } from "./zipWith_"

/**
 * Zips this fiber and the specified fiber together, producing a tuple of their output.
 */
export const zip_ = <E, A, E1, A1>(
  fiberA: Fiber<E, A>,
  fiberB: Fiber<E1, A1>
): Syntetic<E | E1, [A, A1]> => zipWith_(fiberA, fiberB, (a, b) => [a, b])
