import type { Trace } from "../../Trace/definition"
import type { Cause } from "../definition"
import { Both, Die, empty, Fail, Interrupt, Stackless, Then } from "../definition"
import { fold_ } from "./fold"

/**
 * Transforms the traces in this cause with the specified function.
 */
export function mapTrace_<E>(self: Cause<E>, f: (trace: Trace) => Trace): Cause<E> {
  return fold_<E, Cause<E>>(
    self,
    () => empty,
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
  return <E>(self: Cause<E>): Cause<E> => mapTrace_(self, f)
}
