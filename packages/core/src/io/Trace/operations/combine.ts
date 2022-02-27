import { Trace } from "../definition"

/**
 * Combine two `Trace`s.
 *
 * @tsplus operator ets/Trace +
 * @tsplus fluent ets/Trace combine
 */
export function combine_(self: Trace, that: Trace): Trace {
  return Trace(self.fiberId + that.fiberId, self.stackTrace + that.stackTrace)
}

/**
 * Combine two `Trace`s.
 *
 * @ets_data_first combine_
 */
export function combine(that: Trace) {
  return (self: Trace): Trace => combine_(self, that)
}
