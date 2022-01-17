import type { UIO } from "../../Effect"
import { failNow } from "../../Effect/operations/failNow"
import type { Promise } from "../definition"
import { completeWith_ } from "./completeWith"

/**
 * Fails the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function fail_<E, A>(self: Promise<E, A>, e: E, __trace?: string): UIO<boolean> {
  return completeWith_(self, failNow(e), __trace)
}

/**
 * Fails the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @ets_data_first fail_
 */
export function fail<E>(e: E, __trace?: string) {
  return <A>(self: Promise<E, A>): UIO<boolean> => fail_(self, e, __trace)
}
