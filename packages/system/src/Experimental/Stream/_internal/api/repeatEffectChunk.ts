// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import * as T from "../../../../Effect"
import * as O from "../../../../Option"
import type * as C from "../core.js"
import * as RepeatEffectChunkOption from "./repeatEffectChunkOption.js"

/**
 * Creates a stream from an effect producing chunks of `A` values which repeats forever.
 */
export function repeatEffectChunk<R, E, A>(
  fa: T.Effect<R, E, CK.Chunk<A>>
): C.Stream<R, E, A> {
  return RepeatEffectChunkOption.repeatEffectChunkOption(T.mapError_(fa, O.some))
}
