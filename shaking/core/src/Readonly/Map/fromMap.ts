/**
 * @since 2.5.0
 */
export function fromMap<K, A>(m: Map<K, A>): ReadonlyMap<K, A> {
  return new Map(m)
}
