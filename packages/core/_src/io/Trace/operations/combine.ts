/**
 * Combine two `Trace`s.
 *
 * @tsplus operator ets/Trace +
 * @tsplus fluent ets/Trace combine
 */
export function combine_(self: Trace, that: Trace): Trace {
  return Trace(self.fiberId + that.fiberId, self.stackTrace + that.stackTrace);
}

/**
 * Combine two `Trace`s.
 */
export const combine = Pipeable(combine_);
