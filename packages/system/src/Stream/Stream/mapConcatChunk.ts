import * as Array from "../../Array"
import { pipe } from "../../Function"
import type { Stream } from "./definitions"
import { mapChunks } from "./mapChunks"

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 */
export const mapConcatChunk = <O, O2>(f: (_: O) => Array.Array<O2>) => <R, E>(
  self: Stream<R, E, O>
): Stream<R, E, O2> =>
  pipe(
    self,
    mapChunks((o) => Array.chain_(o, f))
  )
