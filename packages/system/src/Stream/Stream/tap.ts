// ets_tracing: off

import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { mapM_ } from "./mapM.js"

/**
 * Adds an effect to consumption of every element of the stream.
 */
export function tap_<R, R1, E, E1, O, X>(
  self: Stream<R, E, O>,
  f: (o: O) => T.Effect<R1, E1, X>
): Stream<R & R1, E | E1, O> {
  return mapM_(self, (o) => T.as_(f(o), o))
}

/**
 * Adds an effect to consumption of every element of the stream.
 */
export function tap<R, R1, E, E1, O, X>(f: (o: O) => T.Effect<R1, E1, X>) {
  return (self: Stream<R, E, O>) => tap_(self, f)
}
