import type { Effect } from "../../Effect"
import { ensuringFirst_ as enMan } from "../../Managed"
import { Stream } from "./definitions"

/**
 * Executes the provided finalizer before this stream's finalizers run.
 */
export function ensuringFirst<R1>(fin: Effect<R1, never, unknown>) {
  return <R, E, O>(self: Stream<R, E, O>) => ensuringFirst_(self, fin)
}

/**
 * Executes the provided finalizer before this stream's finalizers run.
 */
export function ensuringFirst_<R, E, O, R1>(
  self: Stream<R, E, O>,
  fin: Effect<R1, never, unknown>
) {
  return new Stream<R & R1, E, O>(enMan(self.proc, fin))
}
