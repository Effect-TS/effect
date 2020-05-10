import type { Either } from "fp-ts/lib/Either"
import type { Option } from "fp-ts/lib/Option"

import { none } from "./none"
import { some } from "./some"

/**
 * Returns an `A` value if possible
 *
 * @since 2.0.0
 */
export function getRight<E, A>(ma: Either<E, A>): Option<A> {
  return ma._tag === "Left" ? none : some(ma.right)
}
