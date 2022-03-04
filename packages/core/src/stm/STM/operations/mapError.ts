import { STM } from "../definition"

/**
 * Maps from one error type to another.
 *
 * @tsplus fluent ets/STM mapError
 */
export function mapError_<R, E, A, E1>(
  self: STM<R, E, A>,
  f: (a: E) => E1
): STM<R, E1, A> {
  return self.foldSTM((e) => STM.fail(f(e)), STM.succeedNow)
}

/**
 * Maps from one error type to another.
 *
 * @ets_data_first mapError_
 */
export function mapError<E, E1>(f: (a: E) => E1) {
  return <R, A>(self: STM<R, E, A>): STM<R, E1, A> => self.mapError(f)
}
