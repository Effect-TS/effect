import { isDieType as causeIsDieType } from "../../Cause/definition"
import { find as causeFind } from "../../Cause/operations/find"
import { map_ as causeMap_ } from "../../Cause/operations/map"
import { pipe } from "../../Function"
import type { Option } from "../../Option"
import { fold as optionFold, none as optionNone } from "../../Option/core"
import type { Effect } from "../definition"
import { catchAllCause_ } from "./catchAllCause"
import { failCause } from "./failCause"

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 */
export function unrefineWith_<R, E, E1, E2, A>(
  fa: Effect<R, E, A>,
  pf: (u: unknown) => Option<E1>,
  f: (e: E) => E2,
  __trace?: string
) {
  return catchAllCause_(
    fa,
    (cause): Effect<R, E1 | E2, A> =>
      pipe(
        cause,
        causeFind((c) => (causeIsDieType(c) ? pf(c.value) : optionNone)),
        optionFold(() => failCause(causeMap_(cause, f)), fail)
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
  pf: (u: unknown) => Option<E1>,
  f: (e: E) => E2,
  __trace?: string
) {
  return <R, A>(fa: Effect<R, E, A>) => unrefineWith_(fa, pf, f, __trace)
}
