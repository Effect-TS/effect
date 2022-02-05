// ets_tracing: off

import type { Array } from "../Collections/Immutable/Array/index.js"
import type { MutableArray } from "../Support/Mutable/index.js"
import { chain_, succeed, suspend } from "./core.js"
import type { Effect } from "./effect.js"
import { map_ } from "./map.js"

/**
 * Drops all elements so long as the effectful predicate returns true.
 *
 * @ets_data_first dropWhile_
 */
export function dropWhile<A, R, E>(
  p: (a: A) => Effect<R, E, boolean>,
  __trace?: string
) {
  return (as: Iterable<A>) => dropWhile_(as, p, __trace)
}

/**
 * Drops all elements so long as the effectful predicate returns true.
 */
export function dropWhile_<A, R, E>(
  as: Iterable<A>,
  p: (a: A) => Effect<R, E, boolean>,
  __trace?: string
): Effect<R, E, Array<A>> {
  return suspend(() => {
    let dropping = succeed(true) as Effect<R, E, boolean>
    const r: MutableArray<A> = []
    for (const a of as) {
      dropping = chain_(dropping, (d) => {
        if (d) {
          return p(a)
        } else {
          r.push(a)
          return succeed(false)
        }
      })
    }
    return map_(dropping, () => r, __trace)
  })
}
