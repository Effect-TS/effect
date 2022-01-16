// ets_tracing: off

import { squashWith_ } from "../../Cause"
import type { Managed } from "../definition"
import { failNow } from "./failNow"
import { foldManaged_ } from "./foldManaged"
import { sandbox } from "./sandbox"
import { succeedNow } from "./succeedNow"

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 */
export function absorbWith_<R, E, A>(
  self: Managed<R, E, A>,
  f: (e: E) => unknown,
  __trace?: string
): Managed<R, unknown, A> {
  return foldManaged_(
    sandbox(self),
    (cause) => failNow(squashWith_(cause, f)),
    succeedNow,
    __trace
  )
}

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @ets_data_first absorbWith_
 */
export function absorbWith<E>(f: (e: E) => unknown, __trace?: string) {
  return <R, A>(self: Managed<R, E, A>): Managed<R, unknown, A> =>
    absorbWith_(self, f, __trace)
}
