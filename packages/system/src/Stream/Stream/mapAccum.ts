import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { mapAccumM } from "./mapAccumM"

/**
 * Statefully maps over the elements of this stream to produce new elements.
 */
export function mapAccum<Z>(z: Z) {
  return <O, O1>(f: (z: Z, o: O) => [Z, O1]) => <R, E>(self: Stream<R, E, O>) =>
    mapAccumM(z)((z, o: O) => T.succeed(f(z, o)))(self)
}
