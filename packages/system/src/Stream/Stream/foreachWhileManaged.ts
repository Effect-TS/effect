import type * as T from "../../Effect"
import type * as M from "../../Managed"
import { foreachWhile } from "../Sink"
import type { Stream } from "./definitions"
import { runManaged_ } from "./runManaged"

/**
 * Like `Stream#foreachWhile`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function foreachWhileManaged_<R, R1, E, E1, O>(
  self: Stream<R, E, O>,
  f: (o: O) => T.Effect<R1, E1, boolean>
): M.Managed<R & R1, E | E1, void> {
  return runManaged_(self, foreachWhile(f))
}

/**
 * Like `Stream#foreachWhile`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function foreachWhileManaged<R1, E1, O>(f: (o: O) => T.Effect<R1, E1, boolean>) {
  return <R, E>(self: Stream<R, E, O>) => foreachWhileManaged_(self, f)
}
