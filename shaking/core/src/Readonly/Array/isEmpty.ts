/**
 * Test whether an array is empty
 *
 * @example
 * import { isEmpty } from 'fp-ts/lib/ReadonlyArray'
 *
 * assert.strictEqual(isEmpty([]), true)
 *
 * @since 2.5.0
 */
export function isEmpty<A>(as: ReadonlyArray<A>): boolean {
  return as.length === 0
}
