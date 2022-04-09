/**
 * @tsplus getter ets/Metric apply
 */
export function apply<A>(self: Metric<A>, __tsplusTrace?: string) {
  return <R, E, A1 extends A>(effect: Effect<R, E, A1>): Effect<R, E, A1> => self.appliedAspect(effect);
}
