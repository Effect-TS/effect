import type { ReadonlyNonEmptyArray } from "fp-ts/lib/ReadonlyNonEmptyArray"

/**
 * Test whether an array is non empty narrowing down the type to `NonEmptyReadonlyArray<A>`
 *
 * @since 2.5.0
 */
export function isNonEmpty<A>(as: ReadonlyArray<A>): as is ReadonlyNonEmptyArray<A> {
  return as.length > 0
}
