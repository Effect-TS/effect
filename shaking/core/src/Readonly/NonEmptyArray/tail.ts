import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

/**
 * @since 2.5.0
 */
export function tail<A>(nea: ReadonlyNonEmptyArray<A>): ReadonlyArray<A> {
  return nea.slice(1)
}
