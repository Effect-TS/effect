import { chain, succeed, traceAs } from "./core"

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 */
export function map<A, B>(f: (a: A) => B) {
  return chain(traceAs(f)((a: A) => succeed(f(a))))
}
