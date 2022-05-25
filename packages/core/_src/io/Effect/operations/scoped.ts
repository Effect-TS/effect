/**
 * Scopes all resources uses in this workflow to the lifetime of the workflow,
 * ensuring that their finalizers are run as soon as this workflow completes
 * execution, whether by success, failure, or interruption.
 *
 * @tsplus static ets/Effect/Ops scoped
 * @tsplus fluent ets/Effect scoped
 */
export function scoped<R, E, A>(
  effect: LazyArg<Effect<R & Has<Scope>, E, A>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Scope.make.flatMap((scope) => scope.use(effect))
}
