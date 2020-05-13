import { concat as concat_1 } from "../Readonly/NonEmptyArray/concat"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.2.0
 */
export function concat<A>(fx: Array<A>, fy: NonEmptyArray<A>): NonEmptyArray<A>
export function concat<A>(fx: NonEmptyArray<A>, fy: Array<A>): NonEmptyArray<A>
export function concat<A>(fx: Array<A>, fy: Array<A>): Array<A> {
  return concat_1(fx as any, fy as any) as any
}
