import type * as T from "../_internal/effect"
import type * as A from "../../Array"
import { identity, pipe } from "../../Function"
import type { Stream } from "./definitions"
import { mapConcatChunk } from "./mapConcatChunk"
import { mapM } from "./mapM"

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 */
export const mapConcatChunkM = <S2, R2, E2, O, O2>(
  f: (_: O) => T.Effect<S2, R2, E2, A.Array<O2>>
) => <S, R, E>(self: Stream<S, R, E, O>) =>
  pipe(self, mapM(f), mapConcatChunk(identity))
