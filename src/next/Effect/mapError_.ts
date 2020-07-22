import { pipe } from "../../Function"
import { map } from "../Cause/map"

import { Effect } from "./effect"
import { foldCauseM_ } from "./foldCauseM_"
import { halt } from "./halt"
import { succeedNow } from "./succeedNow"

/**
 * Returns an effect with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger"
 * error.
 */
export const mapError_ = <S, R, E, E2, A>(self: Effect<S, R, E, A>, f: (e: E) => E2) =>
  foldCauseM_(
    self,
    (c) => pipe(c, map(f), halt),
    (a) => succeedNow(a)
  )
