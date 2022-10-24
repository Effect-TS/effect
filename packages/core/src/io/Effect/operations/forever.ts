/**
 * Repeats this effect forever (until the first error).
 *
 * @tsplus getter effect/core/io/Effect forever
 * @category mutations
 * @since 1.0.0
 */
export function forever<R, E, A>(self: Effect<R, E, A>): Effect<R, E, never> {
  const loop: Effect<R, E, never> = self.flatMap(() => Effect.yieldNow).flatMap(() => loop)
  return loop
}
