import type * as T from "../_internal/effect"
import * as SK from "../Sink"
import type { Stream } from "./definitions"
import { run_ } from "./run"

/**
 * Consumes elements of the stream, passing them to the specified callback,
 * and terminating consumption when the callback returns `false`.
 */
export function foreachWhile_<R, R1, E, E1, O>(
  self: Stream<R, E, O>,
  f: (o: O) => T.Effect<R1, E1, boolean>
): T.Effect<R & R1, E | E1, void> {
  return run_(self, SK.foreachWhile(f))
}

/**
 * Consumes elements of the stream, passing them to the specified callback,
 * and terminating consumption when the callback returns `false`.
 */
export function foreachWhile<R1, E1, O>(f: (o: O) => T.Effect<R1, E1, boolean>) {
  return <R, E>(self: Stream<R, E, O>) => foreachWhile_(self, f)
}
