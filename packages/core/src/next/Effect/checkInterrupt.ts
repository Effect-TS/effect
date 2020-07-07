import { InterruptStatus } from "../Fiber/interruptStatus"

import { Effect } from "./effect"
import { ICheckInterrupt } from "./primitives"

/**
 * Checks the interrupt status, and produces the effect returned by the
 * specified callback.
 */
export const checkInterrupt = <S, R, E, A>(
  f: (_: InterruptStatus) => Effect<S, R, E, A>
): Effect<S, R, E, A> => new ICheckInterrupt(f)
