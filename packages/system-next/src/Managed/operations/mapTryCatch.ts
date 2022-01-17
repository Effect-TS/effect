import type { Managed } from "../definition"
import { failNow } from "./failNow"
import { foldManaged_ } from "./foldManaged"
import { tryCatch } from "./tryCatch"

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 */
export function mapTryCatch_<R, E, E2, A, B>(
  self: Managed<R, E, A>,
  onThrow: (u: unknown) => E2,
  f: (a: A) => B,
  __trace?: string
): Managed<R, E | E2, B> {
  return foldManaged_(
    self,
    (e) => failNow(e),
    (a) => tryCatch(() => f(a), onThrow),
    __trace
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
  __trace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R, E | E2, B> =>
    mapTryCatch_(self, onThrow, f, __trace)
}
