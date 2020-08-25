import { flow, pipe } from "../Function"
import * as O from "../Option/core"
import type { Effect } from "."
import { chain_, succeed } from "./core"
import { fail } from "./fail"

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 */
export function collectM_<S, R, E, E1, A, S2, R2, E2, A2>(
  fa: Effect<S, R, E, A>,
  f: () => E1,
  pf: (a: A) => O.Option<Effect<S2, R2, E2, A2>>
) {
  return chain_(
    fa,
    (a): Effect<S2, R2, E1 | E2, A2> =>
      pipe(
        pf(a),
        O.getOrElse(() => fail(f()))
      )
  )
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 */
export function collectM<E1, A, S2, R2, E2, A2>(
  f: () => E1,
  pf: (a: A) => O.Option<Effect<S2, R2, E2, A2>>
) {
  return <S, R, E>(fa: Effect<S, R, E, A>) => collectM_(fa, f, pf)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 */
export function collect_<S, R, E, E1, A, A2>(
  fa: Effect<S, R, E, A>,
  f: () => E1,
  pf: (a: A) => O.Option<A2>
) {
  return collectM_(fa, f, flow(pf, O.map(succeed)))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 */
export function collect<E1, A, A2>(f: () => E1, pf: (a: A) => O.Option<A2>) {
  return <S, R, E>(fa: Effect<S, R, E, A>) => collect_(fa, f, pf)
}
