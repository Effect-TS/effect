import * as Cause from "../Cause/core"

import { Effect } from "./effect"
import { foldCauseM_ } from "./foldCauseM_"
import { halt } from "./halt"
import { succeedNow } from "./succeedNow"

/**
 * Converts all failures to unchecked exceptions
 */
export const orDieKeep = <S, R, E, A>(effect: Effect<S, R, E, A>) =>
  foldCauseM_(effect, (ce) => halt(Cause.chain((e: E) => Cause.Die(e))(ce)), succeedNow)
