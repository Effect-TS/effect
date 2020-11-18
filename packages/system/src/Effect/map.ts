import { flow } from "../Function"
import { traceF, traceFrom, traceWith } from "../Tracing"
import { chain, succeed } from "./core"

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 */
export function map<A, B>(f: (a: A) => B) {
  const trace = traceF(() => flow(traceFrom(f), traceWith("Effect/map")))
  return chain(trace((a: A) => succeed(f(a))))
}
