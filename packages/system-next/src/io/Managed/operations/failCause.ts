import type { LazyArg } from "../../../data/Function"
import type { Cause } from "../../Cause"
import { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Returns an effect that models failure with the specified `Cause`.
 *
 * @ets static ets/ManagedOps failCause
 */
export function failCause<E>(
  f: LazyArg<Cause<E>>,
  __etsTrace?: string
): Managed<unknown, E, never> {
  return Managed.fromEffect(Effect.failCause(f))
}
