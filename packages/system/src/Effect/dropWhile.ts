// tracing: off

import type { Array } from "../Array"
import type { MutableArray } from "../Mutable"
import { chain_, succeed, suspend } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map"

/**
 * Drops all elements so long as the effectful predicate returns true.
 *
 * @dataFirst dropWhile_
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
