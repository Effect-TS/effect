// ets_tracing: off

import type { Predicate } from "../../../../Function/index.js"
import type * as M from "../../../../Managed/index.js"
import * as SK from "../../Sink/index.js"
import type * as C from "../core.js"
import * as RunManaged from "./runManaged.js"

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 */
export function runReduceWhileManaged_<S, R, E, A>(
  self: C.Stream<R, E, A>,
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => S
): M.Managed<R, E, S> {
  return RunManaged.runManaged_(self, SK.reduce(s, cont, f))
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 *
 * @ets_data_first runFoldWhileManaged_
 */
export function runReduceWhileManaged<S, A>(
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => S
) {
  return <R, E>(self: C.Stream<R, E, A>): M.Managed<R, E, S> =>
    runReduceWhileManaged_(self, s, cont, f)
}
