import type { Option } from "../Option"
import { fromArray as fromArray_1 } from "../Readonly/NonEmptyArray/fromArray"

import type { NonEmptyArray } from "./NonEmptyArray"
/**
 * Builds a `NonEmptyArray` from an `Array` returning `none` if `as` is an empty array
 *
 * @since 2.0.0
 */
export const fromArray: <A>(
  as: Array<A>
) => Option<NonEmptyArray<A>> = fromArray_1 as any
