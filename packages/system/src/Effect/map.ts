import { traceAs } from "../Tracing"
import { chain, succeed } from "./core"

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 *
 * @module Effect
 * @trace 0
 */
export function map<A, B>(f: (a: A) => B) {
  return chain(traceAs((a: A) => succeed(f(a)), f))
}
