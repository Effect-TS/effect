import type * as T from "../_internal/effect"
import * as Sink from "../Sink"
import type { Stream } from "./definitions"
import { run_ } from "./run"

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function foreach_<R, R1, E, E1, A>(
  self: Stream<R, E, A>,
  f: (i: A) => T.Effect<R1, E1, any>
): T.Effect<R & R1, E1 | E, void> {
  return run_(self, Sink.foreach(f))
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function foreach<R1, E1, A>(f: (i: A) => T.Effect<R1, E1, any>) {
  return <R, E>(self: Stream<R, E, A>) => foreach_(self, f)
}
