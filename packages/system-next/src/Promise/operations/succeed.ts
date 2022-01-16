// ets_tracing: off

import type { UIO } from "../../Effect"
import { succeedNow } from "../../Effect/operations/succeedNow"
import type { Promise } from "../definition"
import { completeWith_ } from "./completeWith"

/**
 * Completes the promise with the specified value.
 */
export function succeed_<E, A>(
  self: Promise<E, A>,
  value: A,
  __trace?: string
): UIO<boolean> {
  return completeWith_(self, succeedNow(value), __trace)
}

/**
 * Completes the promise with the specified value.
 *
 * @ets_data_first succeed_
 */
export function succeed<A>(value: A, __trace?: string) {
  return <E>(self: Promise<E, A>): UIO<boolean> => succeed_(self, value, __trace)
}
