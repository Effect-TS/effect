// ets_tracing: off

import { modify } from "./modify"

/**
 * Atomically modifies the `FiberRef` with the specified function and returns
 * the result.
 */
export function updateAndGet<A>(f: (a: A) => A) {
  return modify<A, A>((v) => {
    const result = f(v)
    return [result, result]
  })
}
