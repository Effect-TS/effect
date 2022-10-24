/**
 * Returns an effect that ignores errors and runs repeatedly until it
 * eventually succeeds.
 *
 * @tsplus getter effect/core/io/Effect eventually
 * @category mutations
 * @since 1.0.0
 */
export function eventually<R, E, A>(self: Effect<R, E, A>): Effect<R, never, A> {
  return self.orElse(Effect.yieldNow.flatMap(() => self.eventually))
}
