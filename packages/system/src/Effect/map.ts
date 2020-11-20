import { traceAs } from "../Tracing"
import { chain, succeed } from "./core"

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 *
 * Trace Effect map [0]
 */
export function map<A, B>(f: (a: A) => B) {
  return chain(traceAs(f)((a: A) => succeed(f(a))))
}
