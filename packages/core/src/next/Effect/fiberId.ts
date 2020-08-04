import { FiberID } from "../Fiber/id"

import { checkDescriptor } from "./checkDescriptor"
import { Sync } from "./effect"
import { succeed } from "./succeed"

/**
 * Returns the `FiberID` of the fiber executing the effect that calls this method.
 */
export const fiberId: () => Sync<FiberID> = () => checkDescriptor((d) => succeed(d.id))
