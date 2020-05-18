import type { Either } from "../Either/either"
import type { FunctionN } from "../Function"
import type { Effect } from "../Support/Common/effect"

import { chain_ } from "./chain"
import { encaseEither } from "./encaseEither"

export function chainEither<A, E, B>(
  bind: FunctionN<[A], Either<E, B>>
): <S, R, E2>(eff: Effect<S, R, E2, A>) => Effect<S, R, E | E2, B> {
  return (inner) => chain_(inner, (a) => encaseEither(bind(a)))
}
