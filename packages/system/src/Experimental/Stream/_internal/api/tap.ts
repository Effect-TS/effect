// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as MapEffect from "./mapEffect.js"

/**
 * Adds an effect to consumption of every element of the stream.
 */
export function tap_<R, R1, E, E1, A, Z>(
  self: C.Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, Z>
): C.Stream<R & R1, E | E1, A> {
  return MapEffect.mapEffect_(self, (a) => T.as_(f(a), a))
}

/**
 * Adds an effect to consumption of every element of the stream.
 *
 * @ets_data_first tap_
 */
export function tap<R1, E1, A, Z>(f: (a: A) => T.Effect<R1, E1, Z>) {
  return <R, E>(self: C.Stream<R, E, A>) => tap_(self, f)
}
