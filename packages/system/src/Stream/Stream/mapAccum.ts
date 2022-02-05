// ets_tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { mapAccumM_ } from "./mapAccumM.js"

/**
 * Statefully maps over the elements of this stream to produce new elements.
 */
export function mapAccum_<R, E, Z, O, O1>(
  self: Stream<R, E, O>,
  z: Z,
  f: (z: Z, o: O) => Tp.Tuple<[Z, O1]>
) {
  return mapAccumM_(self, z, (z, o: O) => T.succeed(f(z, o)))
}

/**
 * Statefully maps over the elements of this stream to produce new elements.
 *
 * @ets_data_first mapAccum_
 */
export function mapAccum<Z, O, O1>(z: Z, f: (z: Z, o: O) => Tp.Tuple<[Z, O1]>) {
  return <R, E>(self: Stream<R, E, O>) => mapAccum_(self, z, f)
}
