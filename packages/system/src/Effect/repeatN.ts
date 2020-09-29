import { chain_, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Repeats this effect the specified number of times.
 */
export function repeatN(n: number) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> => repeatN_(self, n)
}

/**
 * Repeats this effect the specified number of times.
 */
export function repeatN_<R, E, A>(self: Effect<R, E, A>, n: number): Effect<R, E, A> {
  return chain_(self, (a) => (n <= 0 ? succeed(a) : repeatN_(self, n - 1)))
}
