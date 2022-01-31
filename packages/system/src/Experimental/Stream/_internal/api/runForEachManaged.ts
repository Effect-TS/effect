// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import type * as M from "../../../../Managed/index.js"
import * as SK from "../../Sink/index.js"
import type * as C from "../core.js"
import * as RunManaged from "./runManaged.js"

/**
 * Like `Stream#forEach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function runForEachManaged_<R, R1, E, A, Z>(
  self: C.Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E, Z>
): M.Managed<R & R1, E, void> {
  return RunManaged.runManaged_(self, SK.forEach(f))
}

/**
 * Like `Stream#forEach`, but returns a `Managed` so the finalization order
 * can be controlled.
 *
 * @ets_data_first runForEachManaged_
 */
export function runForEachManaged<R1, E, A, B>(f: (a: A) => T.Effect<R1, E, B>) {
  return <R>(self: C.Stream<R, E, A>) => runForEachManaged_(self, f)
}
