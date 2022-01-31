import { Managed } from "../definition"

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @tsplus fluent ets/Managed mapTryCatch
 */
export function mapTryCatch_<R, E, E2, A, B>(
  self: Managed<R, E, A>,
  onThrow: (u: unknown) => E2,
  f: (a: A) => B,
  __etsTrace?: string
): Managed<R, E | E2, B> {
  return self.foldManaged(
    (e) => Managed.failNow(e),
    (a) => Managed.tryCatch(f(a), onThrow)
  )
}

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @ets_data_first mapTryCatch_
 */
export function mapTryCatch<E2, A, B>(
  onThrow: (u: unknown) => E2,
  f: (a: A) => B,
  __etsTrace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R, E | E2, B> =>
    mapTryCatch_(self, onThrow, f)
}
