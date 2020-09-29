import type * as T from "../_internal/effect"
import type * as Array from "../../Array"
import { identity, pipe } from "../../Function"
import type { Stream } from "./definitions"
import { mapConcatChunk } from "./mapConcatChunk"
import { mapM } from "./mapM"

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 */
export const mapConcatChunkM = <R2, E2, O, O2>(
  f: (_: O) => T.Effect<R2, E2, Array.Array<O2>>
) => <R, E>(self: Stream<R, E, O>) => pipe(self, mapM(f), mapConcatChunk(identity))
