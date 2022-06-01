/**
 * "Peeks" at the error of the transactional effect.
 *
 * @tsplus fluent ets/STM tapError
 */
export function tapError_<R, E, A, R2, E2, X>(
  self: STM<R, E, A>,
  f: (e: E) => STM<R2, E2, X>
): STM<R | R2, E | E2, A> {
  return self.foldSTM((e) => f(e) > STM.fail(e), STM.succeedNow)
}

/**
 * "Peeks" at the error of the transactional effect.
 *
 * @tsplus static ets/STM/Aspects tapError
 */
export const tapError = Pipeable(tapError_)
