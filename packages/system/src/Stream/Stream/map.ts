import { pipe } from "../../Function"
import type { Stream } from "./definitions"
import { mapChunks } from "./mapChunks"

/**
 * Transforms the chunks emitted by this stream.
 */
export const map = <O, O2>(f: (_: O) => O2) => <R, E>(
  self: Stream<R, E, O>
): Stream<R, E, O2> =>
  pipe(
    self,
    mapChunks((o) => o.map(f))
  )
