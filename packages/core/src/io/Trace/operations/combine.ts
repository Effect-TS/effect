import { Trace } from "../definition"

/**
 * Combine two `Trace`s.
 */
export function combine_(self: Trace, that: Trace): Trace {
  return new Trace(self.fiberId + that.fiberId, self.stackTrace + that.stackTrace)
}

/**
 * Combine two `Trace`s.
 *
 * @ets_data_first combine_
 */
export function combine(that: Trace) {
  return (self: Trace): Trace => combine_(self, that)
}
