import type { Trace } from "../../../io/Trace/definition"
import { Both, Cause, Die, Fail, Interrupt, Stackless, Then } from "../definition"

/**
 * Transforms the traces in this cause with the specified function.
 *
 * @ets fluent ets/Cause mapTrace
 */
export function mapTrace_<E>(self: Cause<E>, f: (trace: Trace) => Trace): Cause<E> {
  return self.fold<E, Cause<E>>(
    Cause.empty,
    (e, trace) => new Fail(e, f(trace)),
    (d, trace) => new Die(d, f(trace)),
    (fiberId, trace) => new Interrupt(fiberId, f(trace)),
    (left, right) => new Then(left, right),
    (left, right) => new Both(left, right),
    (cause, stackless) => new Stackless(cause, stackless)
  )
}

/**
 * Transforms the traces in this cause with the specified function.
 *
 * @ets_data_first mapTrace_
 */
export function mapTrace(f: (trace: Trace) => Trace) {
  return <E>(self: Cause<E>): Cause<E> => self.mapTrace(f)
}
