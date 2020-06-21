import { chain_ } from "../Effect/chain_"
import { done } from "../Effect/done"
import { foreach_ } from "../Effect/foreach_"
import { tap_ } from "../Effect/tap_"

import { Fiber } from "./fiber"
import { waitAll } from "./waitAll"

/**
 * Joins all fibers, awaiting their _successful_ completion.
 * Attempting to join a fiber that has erred will result in
 * a catchable error, _if_ that error does not result from interruption.
 */
export const joinAll = <E, A>(as: Iterable<Fiber<E, A>>) =>
  tap_(chain_(waitAll(as), done), () => foreach_(as, (f) => f.inheritRefs))
