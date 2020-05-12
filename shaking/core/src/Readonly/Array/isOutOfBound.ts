/**
 * Test whether an array contains a particular index
 *
 * @since 2.5.0
 */
export function isOutOfBound<A>(i: number, as: ReadonlyArray<A>): boolean {
  return i < 0 || i >= as.length
}
