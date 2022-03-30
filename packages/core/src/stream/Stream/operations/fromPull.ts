import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { Effect } from "../../../io/Effect"
import type { HasScope } from "../../../io/Scope"
import { Stream } from "../definition"

/**
 * @tsplus static ets/StreamOps fromPull
 */
export function fromPull<R, E, A>(
  effect: LazyArg<Effect<R & HasScope, never, Effect<R, Option<E>, Chunk<A>>>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.unwrapScoped(
    effect().map((pull) => Stream.repeatEffectChunkOption(pull))
  )
}
