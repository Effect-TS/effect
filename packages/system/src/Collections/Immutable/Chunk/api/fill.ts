// ets_tracing: off

import type { Chunk } from "../core.js"
import { append_, empty } from "../core.js"

/**
 * Fills a chunk with the result of applying `f` `n` times
 */
export function fill<A>(n: number, f: (n: number) => A): Chunk<A> {
  if (n <= 0) {
    return empty<A>()
  }
  let builder = empty<A>()
  for (let i = 0; i < n; i++) {
    builder = append_(builder, f(i))
  }
  return builder
}
