import { chain_ } from "../Effect/chain_"
import { done } from "../Effect/done"
import { foreachPar_ } from "../Effect/foreachPar_"
import { result } from "../Effect/result"

import { Fiber } from "./fiber"

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export const waitAll = <E, A>(as: Iterable<Fiber<E, A>>) =>
  result(foreachPar_(as, (f) => chain_(f.wait, done)))
