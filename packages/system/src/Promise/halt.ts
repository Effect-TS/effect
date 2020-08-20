import type { Cause } from "../Cause/cause"
import { halt as effectHalt } from "../Effect/core"
import { completeWith } from "./completeWith"
import type { Promise } from "./promise"

/**
 * Halts the promise with the specified cause, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export const halt = <E>(e: Cause<E>) => <A>(promise: Promise<E, A>) =>
  completeWith<E, A>(effectHalt(e))(promise)
