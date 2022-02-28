import type { LazyArg } from "../../../data/Function"
import type { XPure } from "../definition"
import { Fail } from "../definition"

/**
 * Constructs a computation that always succeeds with the specified value,
 * passing the state through unchanged.
 *
 * @tsplus static ets/XPureOps fail
 */
export function fail<E>(
  e: LazyArg<E>
): XPure<never, unknown, never, unknown, E, never> {
  return new Fail(e)
}
