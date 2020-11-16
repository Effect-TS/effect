import { pipe } from "../../Function"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { mapAccumM } from "./mapAccumM"

/**
 * Statefully maps over the elements of this stream to produce new elements.
 */
export const mapAccum = <Z>(z: Z) => <O, O1>(f: (z: Z, o: O) => [Z, O1]) => <R, E>(
  self: Stream<R, E, O>
) =>
  pipe(
    self,
    mapAccumM(z)((z, o) => T.succeed(f(z, o)))
  )
