import { FunctionN } from "fp-ts/lib/function"

import { Effect } from "../Support/Common/effect"

import { zipWith_ } from "./zipWith"

export const ap: <S1, R, E, A, E2>(
  fa: Effect<S1, R, E, A>
) => <S2, R2, B>(
  fab: Effect<S2, R2, E2, (a: A) => B>
) => Effect<S1 | S2, R & R2, E | E2, B> = (fa) => (fab) => ap_(fab, fa)

/**
 * Applicative ap
 * @param iof
 * @param ioa
 */
export function ap_<S, R, E, A, B, S2, R2, E2>(
  iof: Effect<S, R, E, FunctionN<[A], B>>,
  ioa: Effect<S2, R2, E2, A>
): Effect<S | S2, R & R2, E | E2, B> {
  return zipWith_(iof, ioa, (f, a) => f(a))
}
