import { chain, succeed } from "./core"

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 */
export function map<A, B>(f: (a: A) => B, _trace?: string) {
  return chain((a: A) => succeed(f(a)))
}
