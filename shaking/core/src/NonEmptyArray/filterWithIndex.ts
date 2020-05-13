import type { Option } from "../Option"
import { filterWithIndex as filterWithIndex_1 } from "../Readonly/NonEmptyArray/filterWithIndex"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.0.0
 */
export const filterWithIndex: <A>(
  predicate: (i: number, a: A) => boolean
) => (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>> = filterWithIndex_1 as any
