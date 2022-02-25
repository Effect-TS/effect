import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import type { Exit } from "../../Exit"
import type { Promise } from "../definition"

/**
 * Exits the promise with the specified exit, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @tsplus fluent ets/Promise done
 */
export function done_<E, A>(
  self: Promise<E, A>,
  exit: LazyArg<Exit<E, A>>,
  __tsplusTrace?: string
): Effect<unknown, never, boolean> {
  return self.completeWith(Effect.done(exit))
}

/**
 * Exits the promise with the specified exit, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @ets_data_first die_
 */
export function done<E, A>(exit: LazyArg<Exit<E, A>>, __tsplusTrace?: string) {
  return (self: Promise<E, A>): Effect<unknown, never, boolean> => self.done(exit)
}
