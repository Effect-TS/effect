import { Both, Cause, Die, Fail, Interrupt, Stackless, Then } from "@effect/core/io/Cause/definition"

/**
 * Transforms the traces in this cause with the specified function.
 *
 * @tsplus fluent ets/Cause mapTrace
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
 * @tsplus static ets/Cause/Aspects mapTrace
 */
export const mapTrace = Pipeable(mapTrace_)
