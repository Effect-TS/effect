import type { Ord } from "../Ord"
import { reduce as reduce_1 } from "../Readonly/Set"

/**
 * @since 2.0.0
 */

export const reduce: <A>(
  O: Ord<A>
) => <B>(b: B, f: (b: B, a: A) => B) => (fa: Set<A>) => B = reduce_1
