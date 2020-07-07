import { map } from "./map"

/**
 * Replaces the success value with the one provided.
 */
export const as = <B>(b: B) => map(() => b)
