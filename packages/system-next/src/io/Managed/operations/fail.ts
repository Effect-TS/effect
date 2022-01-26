import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Returns an effect that models failure with the specified error. The moral
 * equivalent of `throw` for pure code.
 *
 * @ets static ets/ManagedOps fail
 */
export function fail<E>(
  f: LazyArg<E>,
  __etsTrace?: string
): Managed<unknown, E, never> {
  return Managed.fromEffect(Effect.fail(f))
}
