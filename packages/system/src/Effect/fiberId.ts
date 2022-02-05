// ets_tracing: off

import { descriptorWith, succeed } from "./core.js"

/**
 * Returns the `FiberID` of the fiber executing the effect that calls this method.
 */
export const fiberId = descriptorWith((d) => succeed(d.id))
