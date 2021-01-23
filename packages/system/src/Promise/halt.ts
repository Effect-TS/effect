import type { Cause } from "../Cause/cause"
import { halt as effectHalt } from "../Effect/core"
import { completeWith } from "./completeWith"
import type { Promise } from "./promise"

/**
 * Halts the promise with the specified cause, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function halt_<E, A>(promise: Promise<E, A>, e: Cause<E>) {
  return completeWith<E, A>(effectHalt(e))(promise)
}

/**
 * Halts the promise with the specified cause, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function halt<E>(e: Cause<E>) {
  return <A>(promise: Promise<E, A>) => halt_(promise, e)
}
