/**
 * Uses the scope by providing it to an `Effect` workflow that needs a scope,
 * guaranteeing that the scope is closed with the result of that workflow as
 * soon as the workflow completes execution, whether by success, failure, or
 * interruption.
 *
 * @tsplus pipeable effect/core/io/Scope/Closeable use
 * @category destructors
 * @since 1.0.0
 */
export function use<R, E, A>(effect: Effect<R, E, A>) {
  return (self: Scope.Closeable): Effect<Exclude<R, Scope>, E, A> =>
    self.extend(effect).onExit((exit) => self.close(exit))
}
