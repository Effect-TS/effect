import type { Sync } from "./definitions"
import { fromArray } from "./fromArray"

/**
 * Creates a single-valued pure stream
 */
export const succeed = <A>(a: A): Sync<A> => fromArray([a])
