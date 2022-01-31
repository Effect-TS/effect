// ets_tracing: off

import * as core from "../core.js"
import * as forEach from "./forEach.js"

/**
 * Groups elements in chunks of up to n elements
 */
export function grouped_<A>(self: core.Chunk<A>, n: number): core.Chunk<core.Chunk<A>> {
  let gr = core.empty<core.Chunk<A>>()
  let current = core.empty<A>()

  forEach.forEach_(self, (a) => {
    current = core.append_(current, a)
    if (core.size(current) >= n) {
      gr = core.append_(gr, current)
      current = core.empty()
    }
  })
  if (core.size(current) > 0) {
    gr = core.append_(gr, current)
  }
  return gr
}

/**
 * Groups elements in chunks of up to n elements
 *
 * @ets_data_first grouped_
 */
export function grouped(
  n: number
): <A>(self: core.Chunk<A>) => core.Chunk<core.Chunk<A>> {
  return (self) => grouped_(self, n)
}
