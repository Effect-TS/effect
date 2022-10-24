import type { Context } from "@fp-ts/data/Context"

/**
 * @tsplus static effect/core/stream/Channel.Ops succeedWith
 * @category constructors
 * @since 1.0.0
 */
export function succeedWith<R, Z>(
  f: (context: Context<R>) => Z
): Channel<R, unknown, unknown, unknown, never, never, Z> {
  return Channel.fromEffect(Effect.environmentWith(f))
}
