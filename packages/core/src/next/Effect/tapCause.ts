import { Cause } from "../Cause/cause"

import { Effect } from "./effect"
import { foldCauseM_ } from "./foldCauseM_"
import { succeed } from "./succeed"

/**
 * Returns an effect that effectually "peeks" at the cause of the failure of
 * this effect.
 */
export const tapCause = <S, R, E, E2>(f: (e: Cause<E2>) => Effect<S, R, E, any>) => <
  S2,
  R2,
  A2
>(
  effect: Effect<S2, R2, E2, A2>
) => foldCauseM_(effect, f, succeed)
