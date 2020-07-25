import { Exit } from "./exit"
import { succeed } from "./succeed"

/**
 * Discards the value.
 */
export const unit: Exit<never, void> =
  
  succeed(undefined)
