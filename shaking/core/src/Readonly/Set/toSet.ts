/**
 * @since 2.5.0
 */

export function toSet<A>(s: ReadonlySet<A>): Set<A> {
  return new Set(s)
}
