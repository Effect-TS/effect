import type * as T from "../_internal/effect"
import type * as M from "../_internal/managed"
import * as SK from "../Sink"
import type { Stream } from "./definitions"
import { runManaged_ } from "./runManaged"

/**
 * Like `foreach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function foreachManaged_<A, R, R1, E, E1>(
  self: Stream<R, E, A>,
  f: (i: A) => T.Effect<R1, E1, any>
): M.Managed<R & R1, E1 | E, void> {
  return runManaged_(self, SK.foreach(f))
}

/**
 * Like `foreach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function foreachManaged<A, R1, E1>(f: (i: A) => T.Effect<R1, E1, any>) {
  return <R, E>(self: Stream<R, E, A>): M.Managed<R & R1, E1 | E, void> =>
    foreachManaged_(self, f)
}
