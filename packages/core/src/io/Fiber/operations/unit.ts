import type { Fiber } from "../definition"
import { succeed } from "./succeed"

/**
 * A fiber that has already succeeded with unit.
 */
export const unit: Fiber<never, void> = succeed(undefined)
