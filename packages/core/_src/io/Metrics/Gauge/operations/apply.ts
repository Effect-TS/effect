/**
 * @tsplus getter ets/Gauge apply
 */
export function apply<A>(self: Gauge<A>, __tsplusTrace?: string) {
  return <R, E, A1 extends A>(effect: Effect<R, E, A1>): Effect<R, E, A1> => self.appliedAspect(effect);
}
