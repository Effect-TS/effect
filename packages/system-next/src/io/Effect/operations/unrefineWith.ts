import { pipe } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { fold as optionFold, none as optionNone } from "../../../data/Option/core"
import { isDieType as causeIsDieType } from "../../Cause/definition"
import { find as causeFind } from "../../Cause/operations/find"
import { map_ as causeMap_ } from "../../Cause/operations/map"
import { Effect } from "../definition"

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 *
 * @ets fluent ets/Effect unrefineWith
 */
export function unrefineWith_<R, E, E1, E2, A>(
  self: Effect<R, E, A>,
  pf: (u: unknown) => Option<E1>,
  f: (e: E) => E2,
  __etsTrace?: string
) {
  return self.catchAllCause(
    (cause): Effect<R, E1 | E2, A> =>
      pipe(
        cause,
        causeFind((c) => (causeIsDieType(c) ? pf(c.value) : optionNone)),
        optionFold(() => Effect.failCauseNow(causeMap_(cause, f)), Effect.failNow)
      )
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
  __etsTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>) => unrefineWith_(self, pf, f)
}
