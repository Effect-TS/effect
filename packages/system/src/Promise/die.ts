import { die as effectDie } from "../Effect/die"
import { completeWith } from "./completeWith"
import type { Promise } from "./promise"

/**
 * Kills the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export const die = (e: unknown) => <E, A>(promise: Promise<E, A>) =>
  completeWith<E, A>(effectDie(e))(promise)
