import type { Predicate, Refinement } from "../../Function"
import type { Option } from "../../Option"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"
import { filterWithIndex } from "./filterWithIndex"

/**
 * @since 2.5.0
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>
): (nea: ReadonlyNonEmptyArray<A>) => Option<ReadonlyNonEmptyArray<A>>
export function filter<A>(
  predicate: Predicate<A>
): (nea: ReadonlyNonEmptyArray<A>) => Option<ReadonlyNonEmptyArray<A>>
export function filter<A>(
  predicate: Predicate<A>
): (nea: ReadonlyNonEmptyArray<A>) => Option<ReadonlyNonEmptyArray<A>> {
  return filterWithIndex((_, a) => predicate(a))
}
