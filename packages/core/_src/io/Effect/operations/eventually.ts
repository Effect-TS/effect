/**
 * Returns an effect that ignores errors and runs repeatedly until it
 * eventually succeeds.
 *
 * @tsplus getter effect/core/io/Effect eventually
 */
export function eventually<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, never, A> {
  return self.orElse(Effect.yieldNow.zipRight(self.eventually))
}
