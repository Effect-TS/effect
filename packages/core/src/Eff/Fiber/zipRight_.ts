import { Fiber, Syntetic } from "./fiber"
import { zipWith_ } from "./zipWith_"

/**
 * Same as `zip` but discards the output of the left hand side.
 */
export const zipRight_ = <E, A, E1, A1>(
  fiberA: Fiber<E, A>,
  fiberB: Fiber<E1, A1>
): Syntetic<E | E1, A1> => zipWith_(fiberA, fiberB, (_, b) => b)
