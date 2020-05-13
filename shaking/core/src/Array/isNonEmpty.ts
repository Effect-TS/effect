import type { NonEmptyArray } from "fp-ts/lib/NonEmptyArray"

import { isNonEmpty as isNonEmpty_1 } from "../Readonly/Array/isNonEmpty"

/**
 * Test whether an array is non empty narrowing down the type to `NonEmptyArray<A>`
 *
 * @since 2.0.0
 */
export const isNonEmpty: <A>(
  as: Array<A>
) => as is NonEmptyArray<A> = isNonEmpty_1 as any
