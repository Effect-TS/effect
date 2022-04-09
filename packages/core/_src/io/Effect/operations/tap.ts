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
  return self.flatMap((a: A) => f(a).map(() => a));
}

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 *
 * @tsplus static ets/Effect/Aspects tap
 */
export const tap = Pipeable(tap_);
