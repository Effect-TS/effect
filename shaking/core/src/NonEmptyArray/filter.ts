import type { Predicate, Refinement } from "../Function"
import type { Option } from "../Option"
import { filter as filter_1 } from "../Readonly/NonEmptyArray/filter"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.0.0
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>
): (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>>
export function filter<A>(
  predicate: Predicate<A>
): (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>>
export function filter<A>(
  predicate: Predicate<A>
): (nea: NonEmptyArray<A>) => Option<NonEmptyArray<A>> {
  return filter_1(predicate) as any
}
