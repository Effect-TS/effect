/**
 * Applies the metric computation to the result of the specified effect.
 *
 * @tsplus getter ets/Metrics/Metric apply
 */
export function apply<Type, In, Out>(self: Metric<Type, In, Out>) {
  return <R, E, A extends In>(effect: Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, A> =>
    effect.tap((a) => self.update(a));
}
