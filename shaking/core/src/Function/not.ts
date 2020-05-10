import type { Predicate } from "./types"

/**
 * @since 2.0.0
 */
export function not<A>(predicate: Predicate<A>): Predicate<A> {
  return (a) => !predicate(a)
}
