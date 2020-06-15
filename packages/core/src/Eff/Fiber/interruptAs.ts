import { interrupt as interruptExit } from "../Exit/interrupt"

import { done } from "./done"
import { FiberID } from "./id"

/**
 * A fiber that is already interrupted.
 */
export const interruptAs = (id: FiberID) => done(interruptExit(id))
