import type { Context } from "@fp-ts/data/Context"

/**
 * Accesses the environment of the channel.
 *
 * @tsplus static effect/core/stream/Channel.Ops environmentWith
 * @category environment
 * @since 1.0.0
 */
export function environmentWith<R, OutDone>(
  f: (context: Context<R>) => OutDone
): Channel<R, unknown, unknown, unknown, never, never, OutDone> {
  return Channel.environment<R>().map(f)
}
