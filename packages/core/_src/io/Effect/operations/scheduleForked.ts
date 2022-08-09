/**
 * Runs this effect according to the specified schedule in a new fiber
 * attached to the current scope.
 *
 * @tsplus static effect/core/io/Effect.Aspects scheduleForked
 * @tsplus pipeable effect/core/io/Effect scheduleForked
 */
export function scheduleForked<S, R1, A1>(schedule: Schedule<S, R1, unknown, A1>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R1 | Scope, E, Fiber.Runtime<unknown, A1>> =>
    self.schedule(schedule).forkScoped
}
