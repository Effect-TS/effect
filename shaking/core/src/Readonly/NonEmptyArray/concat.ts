import { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

/**
 * @since 2.5.0
 */
export function concat<A>(
  fx: ReadonlyArray<A>,
  fy: ReadonlyNonEmptyArray<A>
): ReadonlyNonEmptyArray<A>
export function concat<A>(
  fx: ReadonlyNonEmptyArray<A>,
  fy: ReadonlyArray<A>
): ReadonlyNonEmptyArray<A>
export function concat<A>(
  fx: ReadonlyArray<A>,
  fy: ReadonlyArray<A>
): ReadonlyArray<A> {
  return fx.concat(fy)
}
