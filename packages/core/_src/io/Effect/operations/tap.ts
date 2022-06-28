/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects tap
 * @tsplus pipeable effect/core/io/Effect tap
 */
export function tap<A, R2, E2, X>(f: (a: A) => Effect<R2, E2, X>, __tsplusTrace?: string) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A> => self.flatMap((a: A) => f(a).map(() => a))
}
