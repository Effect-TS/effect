import { mapError_ as effectMapError } from "../../Effect/operations/mapError"
import type { Managed } from "../definition"
import { managedApply } from "../definition"

/**
 * Returns an effect whose failure is mapped by the specified `f` function.
 */
export function mapError_<R, E, A, E1>(
  self: Managed<R, E, A>,
  f: (e: E) => E1,
  __trace?: string
): Managed<R, E1, A> {
  return managedApply(effectMapError(self.effect, f, __trace))
}

/**
 * Returns an effect whose failure is mapped by the specified `f` function.
 *
 * @ets_data_first mapError_
 */
export function mapError<E, E1>(f: (e: E) => E1, __trace?: string) {
  ;<R, A>(self: Managed<R, E, A>): Managed<R, E1, A> => mapError_(self, f, __trace)
}
