/**
 * Scopes all resources uses in this workflow to the lifetime of the workflow,
 * ensuring that their finalizers are run as soon as this workflow completes
 * execution, whether by success, failure, or interruption.
 *
 * @tsplus static effect/core/io/Effect.Ops scoped
 * @tsplus getter effect/core/io/Effect scoped
 * @category scoping
 * @since 1.0.0
 */
export function scoped<R, E, A>(
  effect: Effect<R, E, A>
): Effect<Exclude<R, Scope>, E, A> {
  return Scope.make.flatMap((scope) => scope.use(effect))
}
