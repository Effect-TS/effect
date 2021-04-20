// tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { mapAccumM_ } from "./mapAccumM"

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
 * @dataFirst mapAccum_
 */
export function mapAccum<Z, O, O1>(z: Z, f: (z: Z, o: O) => Tp.Tuple<[Z, O1]>) {
  return <R, E>(self: Stream<R, E, O>) => mapAccum_(self, z, f)
}
