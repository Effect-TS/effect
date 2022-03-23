import type { Chunk } from "../../../collection/immutable/Chunk"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Creates a stream from an effect producing chunks of `A` values until it
 * fails with `None`.
 *
 * @tsplus static ets/StreamOps repeatEffectChunkOption
 */
export function repeatEffectChunkOption<R, E, A>(
  effect: LazyArg<Effect<R, Option<E>, Chunk<A>>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.unfoldChunkEffect(effect, (eff) =>
    eff
      .map((chunk) => Option.some(Tuple(chunk, eff)))
      .catchAll((option) => option.fold(Effect.none, (e) => Effect.fail(e)))
  )
}
