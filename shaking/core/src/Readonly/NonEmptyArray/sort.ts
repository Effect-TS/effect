import type { Ord } from "../../Ord"
import { sort as sort_1 } from "../Array"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

/**
 * @since 2.5.0
 */
export function sort<A>(
  O: Ord<A>
): (nea: ReadonlyNonEmptyArray<A>) => ReadonlyNonEmptyArray<A> {
  return sort_1(O) as any
}
