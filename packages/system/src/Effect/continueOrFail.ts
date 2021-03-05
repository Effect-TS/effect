// tracing: off

import { traceAs, traceCall, tracingSymbol } from "@effect-ts/tracing-utils"

import { pipe } from "../Function"
import * as O from "../Option/core"
import { chain_, succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @trace 1
 * @trace 2
 */
export function continueOrFailM_<R, E, E1, A, R2, E2, A2>(
  fa: Effect<R, E, A>,
  f: () => E1,
  pf: (a: A) => O.Option<Effect<R2, E2, A2>>
) {
  return chain_(
    fa,
    traceAs(
      pf,
      (a): Effect<R2, E1 | E2, A2> =>
        pipe(
          pf(a),
          O.getOrElse(() => traceCall(fail, f[tracingSymbol])(f()))
        )
    )
  )
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @dataFirst continueOrFailM_
 * @trace 0
 * @trace 1
 */
export function continueOrFailM<E1, A, R2, E2, A2>(
  f: () => E1,
  pf: (a: A) => O.Option<Effect<R2, E2, A2>>
) {
  return <R, E>(fa: Effect<R, E, A>) => continueOrFailM_(fa, f, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @trace 1
 * @trace 2
 */
export function continueOrFail_<R, E, E1, A, A2>(
  fa: Effect<R, E, A>,
  f: () => E1,
  pf: (a: A) => O.Option<A2>
) {
  return continueOrFailM_(
    fa,
    f,
    traceAs(pf, (x) => pipe(x, pf, O.map(succeed)))
  )
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @dataFirst continueOrFail_
 * @trace 0
 * @trace 1
 */
export function continueOrFail<E1, A, A2>(f: () => E1, pf: (a: A) => O.Option<A2>) {
  return <R, E>(fa: Effect<R, E, A>) => continueOrFail_(fa, f, pf)
}
