import { STM } from "../definition"

/**
 * "Peeks" at both sides of an transactional effect.
 *
 * @tsplus fluent ets/STM tapBoth
 */
export function tapBoth_<R, E, A, R2, E2, X, R3, E3, X1>(
  self: STM<R, E, A>,
  f: (e: E) => STM<R2, E2, X>,
  g: (a: A) => STM<R3, E3, X1>
): STM<R & R2 & R3, E | E2 | E3, A> {
  return self.foldSTM(
    (e) => f(e) > STM.fail(e),
    (a) => g(a).as(a)
  )
}

/**
 * "Peeks" at both sides of an transactional effect.
 *
 * @ets_data_first tapBoth_
 */
export function tapBoth<E, R2, E2, X, A, R3, E3, X1>(
  f: (e: E) => STM<R2, E2, X>,
  g: (a: A) => STM<R3, E3, X1>
) {
  return <R>(self: STM<R, E, A>): STM<R & R2 & R3, E | E2 | E3, A> => self.tapBoth(f, g)
}
