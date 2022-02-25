import { squashWith_ } from "../../Cause"
import { Managed } from "../definition"

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @tsplus fluent ets/Managed absorbWith
 */
export function absorbWith_<R, E, A>(
  self: Managed<R, E, A>,
  f: (e: E) => unknown,
  __tsplusTrace?: string
): Managed<R, unknown, A> {
  return self
    .sandbox()
    .foldManaged((cause) => Managed.failNow(squashWith_(cause, f)), Managed.succeedNow)
}

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @ets_data_first absorbWith_
 */
export function absorbWith<E>(f: (e: E) => unknown, __tsplusTrace?: string) {
  return <R, A>(self: Managed<R, E, A>): Managed<R, unknown, A> => absorbWith_(self, f)
}
