import type { Ord } from "../Ord"
import { toReadonlyArray } from "../Readonly/Set"

/**
 * @since 2.0.0
 */
export const toArray: <A>(
  O: Ord<A>
) => (set: Set<A>) => Array<A> = toReadonlyArray as any
