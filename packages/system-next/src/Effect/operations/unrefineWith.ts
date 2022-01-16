// ets_tracing: off

import * as Cause from "../../Cause"
import { pipe } from "../../Function"
import * as O from "../../Option"
import type { Effect } from "../definition"
import { catchAllCause_ } from "./catchAllCause"
import { failCause } from "./failCause"

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 */
export function unrefineWith_<R, E, E1, E2, A>(
  fa: Effect<R, E, A>,
  pf: (u: unknown) => O.Option<E1>,
  f: (e: E) => E2,
  __trace?: string
) {
  return catchAllCause_(
    fa,
    (cause): Effect<R, E1 | E2, A> =>
      pipe(
        cause,
        Cause.find((c) => (c._tag === "Die" ? pf(c.value) : O.none)),
        O.fold(() => failCause(Cause.map_(cause, f)), fail)
      ),
    __trace
  )
}

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 *
 * @ets_data_first unrefineWith_
 */
export function unrefineWith<E1, E, E2>(
  pf: (u: unknown) => O.Option<E1>,
  f: (e: E) => E2,
  __trace?: string
) {
  return <R, A>(fa: Effect<R, E, A>) => unrefineWith_(fa, pf, f, __trace)
}
