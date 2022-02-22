import { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 *
 * @tsplus fluent ets/Effect unrefineWith
 */
export function unrefineWith_<R, E, E1, E2, A>(
  self: Effect<R, E, A>,
  pf: (u: unknown) => Option<E1>,
  f: (e: E) => E2,
  __etsTrace?: string
) {
  return self.catchAllCause(
    (cause): Effect<R, E1 | E2, A> =>
      cause
        .find((c) => (c.isDieType() ? pf(c.value) : Option.none))
        .fold(Effect.failCauseNow(cause.map(f)), Effect.failNow)
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
  return <R, A>(self: Effect<R, E, A>) => self.unrefineWith(pf, f)
}
