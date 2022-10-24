import type { Chunk } from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/stream/Stream.Ops fromPull
 * @category conversions
 * @since 1.0.0
 */
export function fromPull<R, E, A>(
  effect: Effect<R | Scope, never, Effect<R, Option<E>, Chunk<A>>>
): Stream<R, E, A> {
  return Stream.unwrapScoped(effect.map((pull) => Stream.repeatEffectChunkOption(pull)))
}
