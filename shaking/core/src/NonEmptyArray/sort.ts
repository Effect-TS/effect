import type { Ord } from "../Ord"
import { sort as sort_1 } from "../Readonly/NonEmptyArray/sort"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.0.0
 */
export const sort: <A>(
  O: Ord<A>
) => (nea: NonEmptyArray<A>) => NonEmptyArray<A> = sort_1 as any
