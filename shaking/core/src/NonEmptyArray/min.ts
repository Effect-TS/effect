import type { Ord } from "../Ord"
import { min as min_1 } from "../Readonly/NonEmptyArray/min"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.0.0
 */
export const min: <A>(ord: Ord<A>) => (nea: NonEmptyArray<A>) => A = min_1
