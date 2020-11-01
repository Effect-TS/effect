import { chain, succeed } from "./core"
import { traceWith } from "./tracing"

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 */
export function map<A, B>(f: (a: A) => B) {
  const traceMap = traceWith("Effect.map")
  return chain(traceMap((a: A) => succeed(f(a))))
}
