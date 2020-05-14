/**
 * @since 2.5.0
 */

export function fromSet<A>(s: Set<A>): ReadonlySet<A> {
  return new Set(s)
}
