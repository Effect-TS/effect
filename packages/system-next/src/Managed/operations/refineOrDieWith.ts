// ets_tracing: off

import type { Option } from "../../Option"
import { fold_ } from "../../Option"
import type { Managed } from "../definition"
import { catchAll_ } from "./catchAll"
import { die } from "./die"
import { failNow } from "./failNow"

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into an `unknown`.
 */
export function refineOrDieWith_<R, A, E, E1>(
  self: Managed<R, E, A>,
  pf: (e: E) => Option<E1>,
  f: (e: E) => unknown,
  __trace?: string
) {
  return catchAll_(
    self,
    (e) =>
      fold_(
        pf(e),
        () => die(f(e)),
        (e1) => failNow(e1)
      ),
    __trace
  )
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into an `unknown`.
 *
 * @ets_data_first refineOrDieWith_
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => Option<E1>,
  f: (e: E) => unknown,
  __trace?: string
) {
  return <R, A>(self: Managed<R, E, A>) => refineOrDieWith_(self, pf, f)
}
