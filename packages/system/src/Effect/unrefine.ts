// tracing: off

import * as C from "../Cause"
import { identity, pipe } from "../Function"
import * as O from "../Option/core"
import { catchAllCause_ } from "./catchAllCause_"
import { halt } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @dataFirst unrefine_
 * @trace 0
 */
export function unrefine<E1>(pf: (u: unknown) => O.Option<E1>) {
  return <R, E, A>(fa: Effect<R, E, A>) => unrefine_(fa, pf)
}

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @trace 1
 */
export function unrefine_<R, E, A, E1>(
  fa: Effect<R, E, A>,
  pf: (u: unknown) => O.Option<E1>
) {
  return unrefineWith_(fa, pf, identity)
}

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 *
 * @dataFirst unrefineWith_
 * @trace 0
 * @trace 1
 */
export function unrefineWith<E1, E, E2>(
  pf: (u: unknown) => O.Option<E1>,
  f: (e: E) => E2
) {
  return <R, A>(fa: Effect<R, E, A>) => unrefineWith_(fa, pf, f)
}

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 *
 * @trace 1
 * @trace 2
 */
export function unrefineWith_<R, E, E1, E2, A>(
  fa: Effect<R, E, A>,
  pf: (u: unknown) => O.Option<E1>,
  f: (e: E) => E2
) {
  return catchAllCause_(
    fa,
    (cause): Effect<R, E1 | E2, A> =>
      pipe(
        cause,
        C.find((c) => (c._tag === "Die" ? pf(c.value) : O.none)),
        O.fold(() => pipe(cause, C.map(f), halt), fail)
      )
  )
}
