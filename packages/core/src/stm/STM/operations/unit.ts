import { constVoid } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Returns an `STM` effect that succeeds with `undefined`.
 *
 * @tsplus static ets/STMOps unit
 */
export const unit = STM.succeed(constVoid)
