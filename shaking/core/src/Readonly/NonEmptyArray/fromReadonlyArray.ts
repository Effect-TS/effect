import { none, Option, some } from "../../Option"
import { isNonEmpty } from "../Array"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

/**
 * Builds a `ReadonlyNonEmptyArray` from an array returning `none` if `as` is an empty array
 *
 * @since 2.5.0
 */
export function fromReadonlyArray<A>(
  as: ReadonlyArray<A>
): Option<ReadonlyNonEmptyArray<A>> {
  return isNonEmpty(as) ? some(as) : none
}
