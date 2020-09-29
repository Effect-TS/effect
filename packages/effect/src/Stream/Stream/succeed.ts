import type { UIO } from "./definitions"
import { fromArray } from "./fromArray"

/**
 * Creates a single-valued pure stream
 */
export const succeed = <A>(a: A): UIO<A> => fromArray([a])
