import type { LazyArg } from "../../../data/Function"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Promise } from "../definition"

/**
 * Completes the promise with the specified value.
 *
 * @tsplus fluent ets/Promise succeed
 */
export function succeed_<E, A>(
  self: Promise<E, A>,
  value: LazyArg<A>,
  __etsTrace?: string
): UIO<boolean> {
  return self.completeWith(Effect.succeed(value))
}

/**
 * Completes the promise with the specified value.
 *
 * @ets_data_first succeed_
 */
export function succeed<A>(value: LazyArg<A>, __etsTrace?: string) {
  return <E>(self: Promise<E, A>): UIO<boolean> => self.succeed(value)
}
