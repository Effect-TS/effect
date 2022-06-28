import { Both, Cause, Die, Fail, Interrupt, Stackless, Then } from "@effect/core/io/Cause/definition"

/**
 * Transforms the traces in this cause with the specified function.
 *
 * @tsplus static effect/core/io/Cause.Aspects mapTrace
 * @tsplus pipeable effect/core/io/Cause mapTrace
 */
export function mapTrace(f: (trace: Trace) => Trace) {
  return <E>(self: Cause<E>): Cause<E> =>
    self.fold<E, Cause<E>>(
      Cause.empty,
      (e, trace) => new Fail(e, f(trace)),
      (d, trace) => new Die(d, f(trace)),
      (fiberId, trace) => new Interrupt(fiberId, f(trace)),
      (left, right) => new Then(left, right),
      (left, right) => new Both(left, right),
      (cause, stackless) => new Stackless(cause, stackless)
    )
}
