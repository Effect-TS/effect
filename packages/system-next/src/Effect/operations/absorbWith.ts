// ets_tracing: off

import { squashWith_ } from "../../Cause/operations/squashWith"
import type { Effect } from "../definition"
import { failNow } from "./failNow"
import { foldEffect_ } from "./foldEffect"
import { sandbox } from "./sandbox"
import { succeedNow } from "./succeedNow"

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 */
export function absorbWith_<R, A, E>(
  self: Effect<R, E, A>,
  f: (e: E) => unknown,
  __trace?: string
) {
  return foldEffect_(
    sandbox(self),
    (x) => failNow(squashWith_(x, f)),
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
  return <R, A>(self: Effect<R, E, A>): Effect<R, unknown, A> =>
    absorbWith_(self, f, __trace)
}
