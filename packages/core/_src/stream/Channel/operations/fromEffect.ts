import { FromEffect } from "@effect/core/stream/Channel/definition/primitives"

/**
 * Use an effect to end a channel.
 *
 * @tsplus static effect/core/stream/Channel.Ops fromEffect
 */
export function fromEffect<R, E, A>(
  effect: LazyArg<Effect<R, E, A>>
): Channel<R, unknown, unknown, unknown, E, never, A> {
  return new FromEffect(effect)
}
