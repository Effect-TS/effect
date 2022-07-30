/**
 * Scopes all resources uses in this workflow to the lifetime of the workflow,
 * ensuring that their finalizers are run as soon as this workflow completes
 * execution, whether by success, failure, or interruption.
 *
 * @tsplus static effect/core/io/Effect.Ops scoped
 * @tsplus getter effect/core/io/Effect scoped
 */
export function scoped<R, E, A>(
  effect: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<Exclude<R, Scope>, E, A> {
  return Scope.make.flatMap((scope) => scope.use(effect))
}
