/**
 * "Peeks" at the success of transactional effect.
 *
 * @tsplus fluent ets/STM tap
 */
export function tap_<R2, E2, A, R, E, X>(
  self: STM<R2, E2, A>,
  f: (a: A) => STM<R, E, X>
) {
  return self.flatMap((a: A) => f(a).map(() => a))
}

/**
 * "Peeks" at the success of transactional effect.
 *
 * @tsplus static ets/STM/Aspects tap
 */
export const tap = Pipeable(tap_)
