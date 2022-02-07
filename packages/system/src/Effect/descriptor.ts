// ets_tracing: off

import { descriptorWith, succeed } from "./core.js"

/**
 * Returns information about the current fiber, such as its identity.
 */
export const descriptor = descriptorWith(succeed)
