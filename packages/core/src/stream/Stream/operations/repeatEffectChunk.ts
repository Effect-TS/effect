import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import type { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Creates a stream from an effect producing chunks of `A` values which
 * repeats forever.
 *
 * @tsplus static ets/StreamOps repeatEffectChunk
 */
export function repeatEffectChunk<R, E, A>(
  effect: LazyArg<Effect<R, E, Chunk<A>>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.repeatEffectChunkOption(effect().mapError(Option.some))
}
