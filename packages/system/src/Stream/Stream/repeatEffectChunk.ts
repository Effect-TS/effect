// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import type * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { repeatEffectChunkOption } from "./repeatEffectChunkOption.js"

/**
 * Creates a stream from an effect producing chunks of `A` values which repeats forever.
 */
export function repeatEffectChunk<R, E, A>(
  fa: T.Effect<R, O.Option<E>, A>
): Stream<R, E, A> {
  return repeatEffectChunkOption(T.map_(fa, A.single))
}
