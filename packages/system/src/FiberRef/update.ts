// tracing: off

import { modify } from "./modify"

/**
 * Atomically modifies the `FiberRef` with the specified function.
 */
export function update<A>(f: (a: A) => A) {
  return modify<A, void>((v) => [undefined, f(v)])
}
