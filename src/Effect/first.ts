import { access } from "./core"

/**
 * Returns an effectful function that extracts out the first element of a
 * tuple.
 */
export function first<A>() {
  return access((_: readonly [A, unknown]) => _[0])
}
