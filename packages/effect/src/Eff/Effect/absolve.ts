import * as E from "../../Either"

import { chain_ } from "./chain_"
import { Effect } from "./effect"
import { fromEither } from "./fromEither"

/**
 * Returns an effect that submerges the error case of an `Either` into the
 * `Effect`.
 */
export const absolve = <S, R, E, E2, A>(v: Effect<S, R, E, E.Either<E2, A>>) =>
  chain_(v, (e) => fromEither(() => e))
