import * as C from "../Cause"
import { FiberID } from "../Fiber/id"

import { halt } from "./halt"

/**
 * Constructs an exit with the specified interruption state
 */
export const interrupt = (id: FiberID) => halt(C.Interrupt(id))
