import type { Effect } from "../../Effect"
import { ensuringFirst_ as enMan } from "../../Managed"
import { Stream } from "./definitions"

/**
 * Executes the provided finalizer before this stream's finalizers run.
 */
export function ensuringFirst<S1, R1>(fin: Effect<S1, R1, never, unknown>) {
  return <S, R, E, O>(self: Stream<S, R, E, O>) => ensuringFirst_(self, fin)
}

/**
 * Executes the provided finalizer before this stream's finalizers run.
 */
export function ensuringFirst_<S, R, E, O, S1, R1>(
  self: Stream<S, R, E, O>,
  fin: Effect<S1, R1, never, unknown>
) {
  return new Stream<S | S1, R & R1, E, O>(enMan(self.proc, fin))
}
