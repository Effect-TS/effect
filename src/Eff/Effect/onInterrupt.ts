import * as S from "../../Set"
import { FiberID } from "../Fiber/id"

import { Effect } from "./effect"
import { onInterrupt_ } from "./uninterruptibleMask"

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 */
export const onInterrupt = <S2, R2>(
  cleanup: (interruptors: S.Set<FiberID>) => Effect<S2, R2, never, any>
) => <S, R, E, A>(self: Effect<S, R, E, A>) => onInterrupt_(self, cleanup)
