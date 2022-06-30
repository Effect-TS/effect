/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @tsplus static effect/core/io/Effect.Aspects mapTryCatch
 * @tsplus pipeable effect/core/io/Effect mapTryCatch
 */
export function mapTryCatch<A, B, E1>(
  f: (a: A) => B,
  onThrow: (u: unknown) => E1,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E | E1, B> =>
    self.flatMap((a) => Effect.tryCatch(() => f(a), onThrow))
}
