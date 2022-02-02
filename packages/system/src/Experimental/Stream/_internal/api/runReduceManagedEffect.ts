// ets_tracing: off

import type * as T from "../../../../Effect"
import type * as M from "../../../../Managed"
import type * as C from "../core"
import * as RunReduceWhileManagedEffect from "./runReduceWhileManagedEffect"

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function runReduceManagedEffect_<R, R1, E, E1, A, S>(
  self: C.Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
): M.Managed<R & R1, E | E1, S> {
  return RunReduceWhileManagedEffect.runReduceWhileManagedEffect_(
    self,
    s,
    (_) => true,
    f
  )
}

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 *
 * @ets_data_first runReduceManagedEffect_
 */
export function runReduceManagedEffect<R1, E1, A, S>(
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
) {
  return <R, E>(self: C.Stream<R, E, A>) => runReduceManagedEffect_(self, s, f)
}
