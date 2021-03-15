// tracing: off

import { chain_, effectPartial } from "./core"
import type { Effect } from "./effect"

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 */
export function mapEffect_<R, E1, E, A, B>(
  self: Effect<R, E1, A>,
  f: (a: A) => B,
  onThrow: (u: unknown) => E,
  __trace?: string
) {
  return chain_(self, (a) => effectPartial(() => f(a), onThrow, __trace))
}

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @dataFirst mapEffect_
 */
export function mapEffect<E, A, B>(
  f: (a: A) => B,
  onThrow: (u: unknown) => E,
  __trace?: string
) {
  return <R, E1>(self: Effect<R, E1, A>) => mapEffect_(self, f, onThrow, __trace)
}
