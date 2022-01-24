import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { tryCatch } from "./tryCatch"

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @ets fluent ets/Effect mapTryCatch
 */
export function mapTryCatch_<R, E1, E, A, B>(
  self: Effect<R, E1, A>,
  f: (a: A) => B,
  onThrow: (u: unknown) => E,
  __etsTrace?: string
): Effect<R, E | E1, B> {
  return chain_(self, (a) => tryCatch(() => f(a), onThrow, __etsTrace))
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
  __etsTrace?: string
) {
  return <R, E1>(self: Effect<R, E1, A>): Effect<R, E | E1, B> =>
    mapTryCatch_(self, f, onThrow, __etsTrace)
}
