// ets_tracing: off

import type { Cause } from "../Cause/cause.js"
import { halt as effectHalt } from "../Effect/core.js"
import { completeWith } from "./completeWith.js"
import type { Promise } from "./promise.js"

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
