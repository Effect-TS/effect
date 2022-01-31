// ets_tracing: off

import { interruptAs as effectInterruptAs } from "../Effect/interruption.js"
import type { FiberID } from "../Fiber/id.js"
import { completeWith } from "./completeWith.js"
import type { Promise } from "./promise.js"

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the specified fiber.
 */
export function interruptAs(id: FiberID) {
  return <E, A>(promise: Promise<E, A>) =>
    completeWith<E, A>(effectInterruptAs(id))(promise)
}
