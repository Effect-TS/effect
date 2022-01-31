// ets_tracing: off

import { pipe } from "../Function/index.js"
import * as O from "../Option/core.js"
import { chain_, succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { failWith } from "./fail.js"

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 */
export function continueOrFailM_<R, E, E1, A, R2, E2, A2>(
  fa: Effect<R, E, A>,
  f: () => E1,
  pf: (a: A) => O.Option<Effect<R2, E2, A2>>,
  __trace?: string
) {
  return chain_(
    fa,
    (a): Effect<R2, E1 | E2, A2> =>
      pipe(
        pf(a),
        O.getOrElse(() => failWith(f))
      ),
    __trace
  )
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @ets_data_first continueOrFailM_
 */
export function continueOrFailM<E1, A, R2, E2, A2>(
  f: () => E1,
  pf: (a: A) => O.Option<Effect<R2, E2, A2>>,
  __trace?: string
) {
  return <R, E>(fa: Effect<R, E, A>) => continueOrFailM_(fa, f, pf, __trace)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 */
export function continueOrFail_<R, E, E1, A, A2>(
  fa: Effect<R, E, A>,
  f: () => E1,
  pf: (a: A) => O.Option<A2>,
  __trace?: string
) {
  return continueOrFailM_(fa, f, (x) => pipe(x, pf, O.map(succeed)), __trace)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @ets_data_first continueOrFail_
 */
export function continueOrFail<E1, A, A2>(
  f: () => E1,
  pf: (a: A) => O.Option<A2>,
  __trace?: string
) {
  return <R, E>(fa: Effect<R, E, A>) => continueOrFail_(fa, f, pf, __trace)
}
