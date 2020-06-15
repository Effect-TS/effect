import { map } from "./map"

/**
 * Substitute the E in the cause
 */
export const as = <E1>(e: E1) => map(() => e)
