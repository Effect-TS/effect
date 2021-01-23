import type { Array } from "../Array"
import type { MutableArray } from "../Mutable"
import { chain_, succeed, suspend } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map"

/**
 * Drops all elements so long as the effectful predicate returns true.
 */
export function dropWhile<A, R, E>(p: (a: A) => Effect<R, E, boolean>) {
  return (as: Iterable<A>) => dropWhile_(as, p)
}

/**
 * Drops all elements so long as the effectful predicate returns true.
 */
export function dropWhile_<A, R, E>(
  as: Iterable<A>,
  p: (a: A) => Effect<R, E, boolean>
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
    return map_(dropping, () => r)
  })
}
