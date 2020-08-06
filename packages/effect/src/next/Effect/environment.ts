import { access } from "./core"

/**
 * Access environment
 */
export const environment = <R>() => access((_: R) => _)
