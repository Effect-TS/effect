import { Exit } from "../definition"

/**
 * @tsplus static ets/ExitOps unit
 */
export const unit: Exit<never, void> = Exit.succeed(undefined)
