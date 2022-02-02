// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import * as T from "../../../../Effect"
import type * as O from "../../../../Option"
import type * as C from "../core"
import * as RepeatEffectChunkOption from "./repeatEffectChunkOption"

/**
 * Creates a stream from an effect producing values of type `A` until it fails with None.
 */
export function repeatEffectOption<R, E, A>(
  fa: T.Effect<R, O.Option<E>, A>
): C.Stream<R, E, A> {
  return RepeatEffectChunkOption.repeatEffectChunkOption(T.map_(fa, CK.single))
}
