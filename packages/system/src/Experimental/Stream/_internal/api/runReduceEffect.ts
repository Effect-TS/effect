// ets_tracing: off

import * as T from "../../../../Effect"
import * as M from "../../../../Managed"
import type * as C from "../core.js"
import * as RunReduceWhileManagedEffect from "./runReduceWhileManagedEffect.js"

/**
 * Executes an effectful fold over the stream of values.
 */
export function runReduceEffect_<R, R1, E, E1, A, S>(
  self: C.Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
): T.Effect<R & R1, E | E1, S> {
  return M.use_(
    RunReduceWhileManagedEffect.runReduceWhileManagedEffect_(self, s, (_) => true, f),
    T.succeed
  )
}

/**
 * Executes an effectful fold over the stream of values.
 *
 * @ets_data_first runReduceEffect_
 */
export function runReduceEffect<R1, E1, A, S>(
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
) {
  return <R, E>(self: C.Stream<R, E, A>) => runReduceEffect_(self, s, f)
}
