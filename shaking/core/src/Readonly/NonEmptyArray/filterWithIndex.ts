import type { Option } from "../../Option"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"
import { fromReadonlyArray } from "./fromReadonlyArray"

/**
 * @since 2.5.0
 */
export function filterWithIndex<A>(
  predicate: (i: number, a: A) => boolean
): (nea: ReadonlyNonEmptyArray<A>) => Option<ReadonlyNonEmptyArray<A>> {
  return (nea) => fromReadonlyArray(nea.filter((a, i) => predicate(i, a)))
}
