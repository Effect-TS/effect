import { constVoid } from "../../Function"
import type { Logger } from "../definition"

/**
 * A logger that does nothing in response to logging events.
 */
export const none: Logger<any, void> = constVoid
