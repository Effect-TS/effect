import { FiberRef } from "../FiberRef"
import { identity } from "../Function"
import * as O from "../Option"

/**
 * A `FiberRef` that stores the name of the fiber, which defaults to `None`.
 */
export const fiberName = new FiberRef<O.Option<string>>(O.none, identity, identity)
