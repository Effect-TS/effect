import { access } from "./access"

/**
 * Access environment
 */
export const environment = <R>() => access((_: R) => _)
