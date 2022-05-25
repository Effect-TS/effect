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
 * @tsplus static ets/STM/Aspects mapError
 */
export const mapError = Pipeable(mapError_)
