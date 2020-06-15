import { Die } from "../Cause/cause"
import { chain } from "../Cause/chain"

import { Effect } from "./effect"
import { foldCauseM_ } from "./foldCauseM_"
import { halt } from "./halt"
import { succeedNow } from "./succeedNow"

/**
 * Converts all failures to unchecked exceptions
 */
export const orDieKeep = <S, R, E, A>(effect: Effect<S, R, E, A>) =>
  foldCauseM_(effect, (ce) => halt(chain((e: E) => Die(e))(ce)), succeedNow)
