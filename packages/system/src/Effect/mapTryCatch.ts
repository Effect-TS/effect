// ets_tracing: off

import { chain_, tryCatch } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 */
export function mapTryCatch_<R, E1, E, A, B>(
  self: Effect<R, E1, A>,
  f: (a: A) => B,
  onThrow: (u: unknown) => E,
  __trace?: string
) {
  return chain_(self, (a) => tryCatch(() => f(a), onThrow, __trace))
}

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @ets_data_first mapTryCatch_
 */
export function mapTryCatch<E, A, B>(
  f: (a: A) => B,
  onThrow: (u: unknown) => E,
  __trace?: string
) {
  return <R, E1>(self: Effect<R, E1, A>) => mapTryCatch_(self, f, onThrow, __trace)
}
