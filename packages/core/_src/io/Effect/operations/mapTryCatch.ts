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
  return self.flatMap((a) => Effect.tryCatch(() => f(a), onThrow));
}

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @tsplus static ets/Effect/Aspects mapTryCatch
 */
export const mapTryCatch = Pipeable(mapTryCatch_);
