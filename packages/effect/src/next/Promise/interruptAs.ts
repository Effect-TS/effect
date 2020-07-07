import { interruptAs as effectInterruptAs } from "../Effect/interruptAs"
import { FiberID } from "../Fiber/id"

import { completeWith } from "./completeWith"
import { Promise } from "./promise"

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the specified fiber.
 */
export const interruptAs = (id: FiberID) => <E, A>(promise: Promise<E, A>) =>
  completeWith<E, A>(effectInterruptAs(id))(promise)
