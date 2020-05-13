import { isEmpty as isEmpty_1 } from "../Readonly/Array/isEmpty"

/**
 * Test whether an array is empty
 *
 * @example
 * import { isEmpty } from 'fp-ts/lib/Array'
 *
 * assert.strictEqual(isEmpty([]), true)
 *
 * @since 2.0.0
 */
export const isEmpty: <A>(as: Array<A>) => boolean = isEmpty_1
