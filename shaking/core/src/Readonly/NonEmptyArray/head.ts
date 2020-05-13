import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

/**
 * @since 2.5.0
 */
export function head<A>(nea: ReadonlyNonEmptyArray<A>): A {
  return nea[0]
}
