import * as E from "../../Either"

import { Fiber, Syntetic } from "./fiber"
import { map_ } from "./map_"
import { orElse } from "./orElse"

/**
 * Returns a fiber that prefers `this` fiber, but falls back to the
 * `that` one when `this` one fails. Interrupting the returned fiber
 * will interrupt both fibers, sequentially, from left to right.
 */
export const orElseEither = <E1, A1>(that: Fiber<E1, A1>) => <E, A>(
  fiber: Fiber<E, A>
): Syntetic<E1 | E, E.Either<A, A1>> => orElse(map_(that, E.right))(map_(fiber, E.left))
