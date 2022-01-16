// ets_tracing: off

import type { Effect } from "../../Effect"
import { exit } from "../../Effect/operations/exit"
import { succeedNow } from "../../Effect/operations/succeedNow"
import type { Exit } from "../definition"
import { failCause } from "./failCause"

/**
 * Applies the function `f` to the successful result of the `Exit` and returns
 * the result in a new `Exit`.
 */
export function forEach_<E, A, R, E1, B>(
  self: Exit<E, A>,
  f: (a: A) => Effect<R, E1, B>
): Effect<R, never, Exit<E | E1, B>> {
  switch (self._tag) {
    case "Failure":
      return succeedNow(failCause(self.cause))
    case "Success":
      return exit(f(self.value))
  }
}

/**
 * Applies the function `f` to the successful result of the `Exit` and returns
 * the result in a new `Exit`.
 *
 * @ets_data_first forEach_
 */
export function forEach<A, R, E1, B>(f: (a: A) => Effect<R, E1, B>) {
  return <E>(self: Exit<E, A>): Effect<R, never, Exit<E | E1, B>> => forEach_(self, f)
}
