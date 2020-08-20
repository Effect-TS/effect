import type { FiberID } from "../Fiber/id"
import { checkDescriptor, succeed } from "./core"
import type { Sync } from "./effect"

/**
 * Returns the `FiberID` of the fiber executing the effect that calls this method.
 */
export const fiberId: () => Sync<FiberID> = () => checkDescriptor((d) => succeed(d.id))
