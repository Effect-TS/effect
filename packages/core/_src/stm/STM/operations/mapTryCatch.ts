/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @tsplus fluent ets/STM mapTryCatch
 */
export function mapTryCatch_<R, E1, E, A, B>(
  self: STM<R, E1, A>,
  f: (a: A) => B,
  onThrow: (u: unknown) => E
): STM<R, E | E1, B> {
  return self.flatMap((a) => STM.tryCatch(() => f(a), onThrow));
}

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @tsplus static ets/STM/Aspects mapTryCatch
 */
export const mapTryCatch = Pipeable(mapTryCatch_);
