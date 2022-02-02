// ets_tracing: off

import * as T from "../../../../Effect"
import * as M from "../../../../Managed"
import type * as C from "../core"
import * as RunReduceWhileManaged from "./runReduceWhileManaged"

/**
 * Executes a pure fold over the stream of values - reduces all elements in the stream to a value of type `S`.
 */
export function runReduce_<R, E, A, S>(
  self: C.Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => S
): T.Effect<R, E, S> {
  return M.use_(
    RunReduceWhileManaged.runReduceWhileManaged_(
      self,
      s,
      (_) => true,
      (s, a) => f(s, a)
    ),
    T.succeed
  )
}

/**
 * Executes a pure fold over the stream of values - reduces all elements in the stream to a value of type `S`.
 *
 * @ets_data_first runReduce_
 */
export function runReduce<A, S>(s: S, f: (s: S, a: A) => S) {
  return <R, E>(self: C.Stream<R, E, A>) => runReduce_(self, s, f)
}
