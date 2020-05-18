import type { FunctionN } from "../Function"
import type { Effect } from "../Support/Common/effect"

import { as } from "./as"
import { chain_ } from "./chain"

export function chainTap<S, R, E, A>(
  bind: FunctionN<[A], Effect<S, R, E, unknown>>
): <S2, R2, E2>(inner: Effect<S2, R2, E2, A>) => Effect<S | S2, R & R2, E | E2, A> {
  return (inner) => chainTap_(inner, bind)
}

export const chainTap_ = <S, R, E, A, S2, R2, E2>(
  inner: Effect<S, R, E, A>,
  bind: FunctionN<[A], Effect<S2, R2, E2, unknown>>
): Effect<S | S2, R & R2, E | E2, A> => chain_(inner, (a) => as(bind(a), a))
