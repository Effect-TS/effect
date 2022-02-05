// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import type * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as RepeatEffectChunkOption from "./repeatEffectChunkOption.js"

/**
 * Creates a stream from an effect producing values of type `A` until it fails with None.
 */
export function repeatEffectOption<R, E, A>(
  fa: T.Effect<R, O.Option<E>, A>
): C.Stream<R, E, A> {
  return RepeatEffectChunkOption.repeatEffectChunkOption(T.map_(fa, CK.single))
}
