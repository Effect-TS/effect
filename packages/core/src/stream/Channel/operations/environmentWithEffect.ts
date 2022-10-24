import type { Context } from "@fp-ts/data/Context"

/**
 * Accesses the environment of the channel in the context of an effect.
 *
 * @tsplus static effect/core/stream/Channel.Ops environmentWithEffect
 * @category environment
 * @since 1.0.0
 */
export function environmentWithEffect<R, R1, OutErr, OutDone>(
  f: (context: Context<R>) => Effect<R1, OutErr, OutDone>
): Channel<R | R1, unknown, unknown, unknown, OutErr, never, OutDone> {
  return Channel.environment<R>().mapEffect(f)
}
