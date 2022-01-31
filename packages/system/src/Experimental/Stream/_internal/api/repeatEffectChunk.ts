// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import * as O from "../../../../Option/index.js"
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
