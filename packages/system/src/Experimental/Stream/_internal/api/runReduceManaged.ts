// ets_tracing: off

import type * as M from "../../../../Managed/index.js"
import type * as C from "../core.js"
import * as RunReduceWhileManaged from "./runReduceWhileManaged.js"

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function runReduceManaged_<R, E, A, S>(
  self: C.Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => S
): M.Managed<R, E, S> {
  return RunReduceWhileManaged.runReduceWhileManaged_(
    self,
    s,
    (_) => true,
    (s, a) => f(s, a)
  )
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 *
 * @ets_data_first runReduceManaged_
 */
export function runReduceManaged<A, S>(s: S, f: (s: S, a: A) => S) {
  return <R, E>(self: C.Stream<R, E, A>) => runReduceManaged_(self, s, f)
}
