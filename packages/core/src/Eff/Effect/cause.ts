import { Empty, Cause } from "../Cause/cause"

import { Effect } from "./effect"
import { foldCauseM_ } from "./foldCauseM_"
import { succeedNow } from "./succeedNow"

export const cause = <S, R, E, A>(
  effect: Effect<S, R, E, A>
): Effect<S, R, never, Cause<E>> =>
  foldCauseM_(effect, succeedNow, () => succeedNow(Empty))
