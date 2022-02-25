import { Managed } from "../definition"

/**
 * Recovers from all errors.
 *
 * @tsplus fluent ets/Managed catchAll
 */
export function catchAll_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  f: (e: E) => Managed<R2, E2, A2>,
  __tsplusTrace?: string
): Managed<R & R2, E2, A | A2> {
  return self.foldManaged(f, Managed.succeedNow)
}

/**
 * Recovers from all errors.
 *
 * @ets_data_first catchAll_
 */
export function catchAll<E, R2, E2, A2>(
  f: (e: E) => Managed<R2, E2, A2>,
  __tsplusTrace?: string
) {
  ;<R, A>(self: Managed<R, E, A>): Managed<R & R2, E2, A | A2> => catchAll_(self, f)
}
