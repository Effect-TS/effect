/**
 * @since 2.0.0
 */

import type { NonEmptyArray } from "../ReadonlyArray"

/** @internal */
export const isNonEmptyArray = <A>(self: ReadonlyArray<A>): self is NonEmptyArray<A> => self.length > 0
