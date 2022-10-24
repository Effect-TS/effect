import type { Context } from "@fp-ts/data/Context"

/**
 * Accesses the environment of the stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops environmentWith
 * @category environment
 * @since 1.0.0
 */
export function environmentWith<R, A>(
  f: (context: Context<R>) => A
): Stream<R, never, A> {
  return Stream.fromEffect(Effect.environmentWith(f))
}
