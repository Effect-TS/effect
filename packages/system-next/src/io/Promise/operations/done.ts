import { Effect } from "../../Effect"
import type { Exit } from "../../Exit"
import type { Promise } from "../definition"
import { completeWith_ } from "./completeWith"

/**
 * Exits the promise with the specified exit, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export function done_<E, A>(
  self: Promise<E, A>,
  exit: Exit<E, A>,
  __etsTrace?: string
): Effect<unknown, never, boolean> {
  return completeWith_(self, Effect.done(exit))
}

/**
 * Exits the promise with the specified exit, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @ets_data_first die_
 */
export function done<E, A>(exit: Exit<E, A>, __etsTrace?: string) {
  return (self: Promise<E, A>): Effect<unknown, never, boolean> => done_(self, exit)
}
