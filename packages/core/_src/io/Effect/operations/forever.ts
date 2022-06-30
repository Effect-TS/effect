/**
 * Repeats this effect forever (until the first error).
 *
 * @tsplus getter effect/core/io/Effect forever
 */
export function forever<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, never> {
  return self.zipRight(Effect.yieldNow).zipRight(self.forever)
}
