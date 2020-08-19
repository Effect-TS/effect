import { FiberID } from "../Fiber/id"

import { Effect } from "./effect"
import { onInterrupt_ } from "./onInterrupt_"

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 */
export const onInterrupt = <S2, R2>(
  cleanup: (interruptors: ReadonlySet<FiberID>) => Effect<S2, R2, never, any>
) => <S, R, E, A>(self: Effect<S, R, E, A>) => onInterrupt_(self, cleanup)
