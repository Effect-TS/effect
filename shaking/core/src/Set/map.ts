import type { Eq } from "../Eq"
import { map as map_1 } from "../Readonly/Set"

/**
 * Projects a Set through a function
 *
 * @since 2.0.0
 */
export const map: <B>(
  E: Eq<B>
) => <A>(f: (x: A) => B) => (set: Set<A>) => Set<B> = map_1 as any
