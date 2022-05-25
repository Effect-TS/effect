/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @tsplus fluent ets/STM reject
 */
export function reject_<R, E, A, E1>(
  self: STM<R, E, A>,
  pf: (a: A) => Option<E1>
): STM<R, E | E1, A> {
  return self.rejectSTM((a) => pf(a).map(STM.failNow))
}

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @tsplus static ets/STM/Aspects reject
 */
export const reject = Pipeable(reject_)
