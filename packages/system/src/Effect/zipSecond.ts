import { chain_ } from "./core"
import type { Effect } from "./effect"

/**
 * Sequentially zips this effect with the specified effect,
 * ignoring result of the first
 */
export function zipSecond<R2, E2, A2>(b: Effect<R2, E2, A2>) {
  return <R, E, A>(a: Effect<R, E, A>): Effect<R & R2, E | E2, A2> =>
    chain_(a, (_) => b)
}
