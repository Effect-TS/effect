import type { Ord } from "../Ord"
import { max as max_1 } from "../Readonly/NonEmptyArray/max"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.0.0
 */
export const max: <A>(ord: Ord<A>) => (nea: NonEmptyArray<A>) => A = max_1
