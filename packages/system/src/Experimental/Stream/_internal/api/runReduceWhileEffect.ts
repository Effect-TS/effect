// ets_tracing: off

import * as T from "../../../../Effect"
import type { Predicate } from "../../../../Function"
import * as M from "../../../../Managed"
import type * as C from "../core"
import * as RunReduceWhileManagedEffect from "./runReduceWhileManagedEffect"

/**
 * Executes an effectful fold over the stream of values.
 * Stops the fold early when the condition is not fulfilled.
 */
export function runReduceWhileEffect_<R, R1, E, E1, A, S>(
  self: C.Stream<R, E, A>,
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
): T.Effect<R & R1, E | E1, S> {
  return M.use_(
    RunReduceWhileManagedEffect.runReduceWhileManagedEffect_(self, s, cont, f),
    T.succeed
  )
}

/**
 * Executes an effectful fold over the stream of values.
 * Stops the fold early when the condition is not fulfilled.
 *
 * @ets_data_first runReduceWhileEffect_
 */
export function runReduceWhileEffect<R1, E1, A, S>(
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
) {
  return <R, E>(self: C.Stream<R, E, A>) => runReduceWhileEffect_(self, s, cont, f)
}
