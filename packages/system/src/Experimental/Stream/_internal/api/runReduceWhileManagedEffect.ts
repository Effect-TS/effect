// ets_tracing: off

import type * as T from "../../../../Effect"
import type { Predicate } from "../../../../Function"
import type * as M from "../../../../Managed"
import * as SK from "../../Sink"
import type * as C from "../core"
import * as RunManaged from "./runManaged"

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 */
export function runReduceWhileManagedEffect_<R, R1, E, E1, A, S>(
  self: C.Stream<R, E, A>,
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
): M.Managed<R & R1, E | E1, S> {
  return RunManaged.runManaged_(self, SK.reduceEffect(s, cont, f))
}

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 */
export function runReduceWhileManagedEffect<R1, E1, A, S>(
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => T.Effect<R1, E1, S>
) {
  return <R, E>(self: C.Stream<R, E, A>) =>
    runReduceWhileManagedEffect_(self, s, cont, f)
}
