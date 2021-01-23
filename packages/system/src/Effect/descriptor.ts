import { descriptorWith, succeed } from "./core"

/**
 * Returns information about the current fiber, such as its identity.
 */
export const descriptor = descriptorWith(succeed)
