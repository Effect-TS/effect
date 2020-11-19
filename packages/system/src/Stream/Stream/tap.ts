import type { Effect } from "../../Effect"
import { as_ } from "../../Effect"
import type { Stream } from "./definitions"
import { mapM_ } from "./mapM"

/**
 * Adds an effect to consumption of every element of the stream.
 */
export function tap_<R, R1, E, E1, O>(
  self: Stream<R, E, O>,
  f: (o: O) => Effect<R1, E1, any>
): Stream<R & R1, E | E1, O> {
  return mapM_(self, (o) => as_(f(o), o))
}

/**
 * Adds an effect to consumption of every element of the stream.
 */
export function tap<R, R1, E, E1, O>(f: (o: O) => Effect<R1, E1, any>) {
  return (self: Stream<R, E, O>) => tap_(self, f)
}
