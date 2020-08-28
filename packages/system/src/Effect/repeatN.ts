import { chain_, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Repeats this effect the specified number of times.
 */
export function repeatN(n: number) {
  return <S, R, E, A>(self: Effect<S, R, E, A>): Effect<S, R, E, A> => repeatN_(self, n)
}

/**
 * Repeats this effect the specified number of times.
 */
export function repeatN_<S, R, E, A>(
  self: Effect<S, R, E, A>,
  n: number
): Effect<S, R, E, A> {
  return chain_(self, (a) => (n <= 0 ? succeed(a) : repeatN_(self, n - 1)))
}
