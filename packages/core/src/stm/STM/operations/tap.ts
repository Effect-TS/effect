import type { STM } from "../definition"

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
 * @ets_data_first tap_
 */
export function tap<R, E, A, X>(f: (a: A) => STM<R, E, X>) {
  return <R2, E2>(self: STM<R2, E2, A>): STM<R & R2, E | E2, A> => self.tap(f)
}
