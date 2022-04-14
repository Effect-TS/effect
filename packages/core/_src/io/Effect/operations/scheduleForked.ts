/**
 * Runs this effect according to the specified schedule in a new fiber
 * attached to the current scope.
 *
 * @tsplus fluent ets/Effect scheduleForked
 */
export function scheduleForked_<R, E, A, S, R1, A1>(
  self: Effect<R, E, A>,
  schedule: LazyArg<Schedule<S, R1, unknown, A1>>,
  __tsplusTrace?: string
): Effect<R & R1 & Has<Scope>, E, Fiber.Runtime<unknown, A1>> {
  return self.schedule(schedule).forkScoped();
}

/**
 * Runs this effect according to the specified schedule in a new fiber
 * attached to the current scope.
 *
 * @tsplus static ets/Effect/Aspects scheduleForked
 */
export function scheduleForked<S, R1, A1>(
  schedule: LazyArg<Schedule<S, R1, unknown, A1>>,
  __tsplusTrace?: string
): <R, E, A>(self: Effect<R, E, A>) => Effect<R & R1 & Has<Scope>, E, Fiber.Runtime<unknown, A1>> {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R1 & Has<Scope>, E, Fiber.Runtime<unknown, A1>> =>
    self.scheduleForked(schedule);
}
