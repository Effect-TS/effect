/**
 * @since 2.0.0
 */

import type { NonEmptyArray } from "../Array.js"

/** @internal */
export type TupleOf<T, N extends number, R extends Array<unknown> = []> = R["length"] extends N ? R
  : TupleOf<T, N, [T, ...R]>

/** @internal */
export const isNonEmptyArray = <A>(self: ReadonlyArray<A>): self is NonEmptyArray<A> => self.length > 0
