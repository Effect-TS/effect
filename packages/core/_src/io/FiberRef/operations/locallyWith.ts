/**
 * Returns an `Effect` that runs with `f` applied to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `acquireRelease`.
 *
 * @tsplus fluent ets/FiberRef locallyWith
 */
export function locallyWith_<A, P>(self: FiberRef<A, P>, f: (a: A) => A, __tsplusTrace?: string) {
  return <R, E, B>(effect: Effect<R, E, B>): Effect<R, E, B> => self.getWith((a) => effect.apply(self.locally(f(a))));
}

/**
 * Returns an `Effect` that runs with `f` applied to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `acquireRelease`.
 *
 * @tsplus static ets/FiberRef/Aspects locallyWith
 */
export const locallyWith = Pipeable(locallyWith_);
