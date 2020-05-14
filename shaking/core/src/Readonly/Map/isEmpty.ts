/**
 * Test whether or not a map is empty
 *
 * @since 2.5.0
 */
export function isEmpty<K, A>(d: ReadonlyMap<K, A>): boolean {
  return d.size === 0
}
