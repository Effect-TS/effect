import { FiberID } from "../Fiber/id"

import { checkDescriptor } from "./checkDescriptor"
import { Sync } from "./effect"
import { succeedNow } from "./succeedNow"

/**
 * Returns the `FiberID` of the fiber executing the effect that calls this method.
 */
export const fiberId: () => Sync<FiberID> = () =>
  checkDescriptor((d) => succeedNow(d.id))
