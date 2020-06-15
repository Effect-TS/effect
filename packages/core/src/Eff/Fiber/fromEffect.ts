import { Async, AsyncE } from "../Effect/effect"
import { map_ } from "../Effect/map_"
import { result } from "../Effect/result"

import { done } from "./done"
import { Syntetic } from "./fiber"

/**
 * Lifts an IO into a `Fiber`.
 */
export const fromEffect = <E, A>(effect: AsyncE<E, A>): Async<Syntetic<E, A>> =>
  map_(result(effect), done)
