import { STM } from "../definition"

/**
 * "Peeks" at the error of the transactional effect.
 *
 * @tsplus fluent ets/STM tapError
 */
export function tapError_<R, E, A, R2, E2, X>(
  self: STM<R, E, A>,
  f: (e: E) => STM<R2, E2, X>
): STM<R & R2, E | E2, A> {
  return self.foldSTM((e) => f(e) > STM.fail(e), STM.succeedNow)
}

/**
 * "Peeks" at the error of the transactional effect.
 *
 * @ets_data_first tapError_
 */
export function tapError<E, R2, E2, X>(f: (e: E) => STM<R2, E2, X>) {
  return <R, A>(self: STM<R, E, A>): STM<R & R2, E | E2, A> => self.tapError(f)
}
