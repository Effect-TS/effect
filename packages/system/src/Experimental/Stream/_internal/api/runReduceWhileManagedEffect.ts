// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import type { Predicate } from "../../../../Function/index.js"
import type * as M from "../../../../Managed/index.js"
import * as SK from "../../Sink/index.js"
import type * as C from "../core.js"
import * as RunManaged from "./runManaged.js"

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
