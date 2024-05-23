/**
 * @since 2.0.0
 */

import type { NonEmptyArray } from "../Array.js"

/** @internal */
type _TupleOf<T, N extends number, R extends Array<unknown>> = R["length"] extends N ? R : _TupleOf<T, N, [T, ...R]>
export type TupleOf<T, N extends number> = N extends N ? number extends N ? Array<T> : _TupleOf<T, N, []> : never

/** @internal */
export const isNonEmptyArray = <A>(self: ReadonlyArray<A>): self is NonEmptyArray<A> => self.length > 0
