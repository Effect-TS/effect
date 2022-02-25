import { Effect } from "../definition"

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @tsplus fluent ets/Effect mapTryCatch
 */
export function mapTryCatch_<R, E1, E, A, B>(
  self: Effect<R, E1, A>,
  f: (a: A) => B,
  onThrow: (u: unknown) => E,
  __tsplusTrace?: string
): Effect<R, E | E1, B> {
  return self.flatMap((a) => Effect.tryCatch(() => f(a), onThrow))
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
  __tsplusTrace?: string
) {
  return <R, E1>(self: Effect<R, E1, A>): Effect<R, E | E1, B> =>
    self.mapTryCatch(f, onThrow)
}
