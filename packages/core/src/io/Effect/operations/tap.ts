import type { Effect } from "../definition"

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 *
 * @tsplus fluent ets/Effect tap
 */
export function tap_<R2, E2, A, R, E, X>(
  self: Effect<R2, E2, A>,
  f: (a: A) => Effect<R, E, X>,
  __tsplusTrace?: string
) {
  return self.flatMap((a: A) => f(a).map(() => a))
}

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 *
 * @ets_data_first tap_
 */
export function tap<R, E, A, X>(f: (a: A) => Effect<R, E, X>, __tsplusTrace?: string) {
  return <R2, E2>(self: Effect<R2, E2, A>): Effect<R & R2, E | E2, A> => self.tap(f)
}
