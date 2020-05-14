/**
 * Create a set with one element
 *
 * @since 2.5.0
 */

export function singleton<A>(a: A): ReadonlySet<A> {
  return new Set([a])
}
