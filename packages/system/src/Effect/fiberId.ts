import { FiberID } from "../Fiber/id"

import { checkDescriptor } from "./core"
import { succeed } from "./core"
import { Sync } from "./effect"

/**
 * Returns the `FiberID` of the fiber executing the effect that calls this method.
 */
export const fiberId: () => Sync<FiberID> = () => checkDescriptor((d) => succeed(d.id))
