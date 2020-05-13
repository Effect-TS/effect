import type { Either } from "../Either/Either"
import type { Effect } from "../Support/Common/effect"

import { chain_ } from "./chain"
import { encaseEither } from "./encaseEither"

export const flattenEither = <S, R, E, E2, A>(
  eff: Effect<S, R, E, Either<E2, A>>
): Effect<S, R, E | E2, A> => chain_(eff, encaseEither)
