import type { Eq } from "../Eq"
import type { Option } from "../Option"
import { filterMap as filterMap_1 } from "../Readonly/Set"

/**
 * @since 2.0.0
 */
export const filterMap: <B>(
  E: Eq<B>
) => <A>(f: (a: A) => Option<B>) => (fa: Set<A>) => Set<B> = filterMap_1 as any
