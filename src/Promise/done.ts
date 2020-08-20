import { done as effectDone } from "../Effect/done"
import type { Exit } from "../Exit/exit"
import { completeWith } from "./completeWith"
import type { Promise } from "./promise"

/**
 * Exits the promise with the specified exit, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export const done = <E, A>(e: Exit<E, A>) => (promise: Promise<E, A>) =>
  completeWith<E, A>(effectDone(e))(promise)
