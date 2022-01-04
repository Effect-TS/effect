// ets_tracing: off

import type { Cause } from "../../Cause"
import type { Effect } from "../../Effect"
import type { Exit } from "../definition"

/**
 * Sequentially zips the this result with the specified result or else returns
 * the failed `Cause<E>`.
 */
export function foldEffect_<E, A, R1, E1, B, R2, E2>(
  self: Exit<E, A>,
  failed: (cause: Cause<E>) => Effect<R1, E1, B>,
  completed: (a: A) => Effect<R2, E2, B>
): Effect<R1 & R2, E1 | E2, B> {
  switch (self._tag) {
    case "Failure":
      return failed(self.cause)
    case "Success":
      return completed(self.value)
  }
}

/**
 * Sequentially zips the this result with the specified result or else returns
 * the failed `Cause<E>`.
 *
 * @ets_data_first foldEffect_
 */
export function foldEffect<E, R1, E1, B, A, R2, E2>(
  failed: (cause: Cause<E>) => Effect<R1, E1, B>,
  completed: (a: A) => Effect<R2, E2, B>
) {
  return (self: Exit<E, A>): Effect<R1 & R2, E1 | E2, B> =>
    foldEffect_(self, failed, completed)
}
