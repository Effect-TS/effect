import { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Creates a stream from an effect producing values of type `A` until it fails
 * with `None`.
 *
 * @tsplus static ets/StreamOps repeatEffectOption
 */
export function repeatEffectOption<R, E, A>(
  effect: LazyArg<Effect<R, Option<E>, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.repeatEffectChunkOption(effect().map(Chunk.single))
}
