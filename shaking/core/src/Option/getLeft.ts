import type { Either } from "fp-ts/lib/Either"
import type { Option } from "fp-ts/lib/Option"

import { none } from "./none"
import { some } from "./some"

/**
 * Returns an `E` value if possible
 *
 * @since 2.0.0
 */
export function getLeft<E, A>(ma: Either<E, A>): Option<E> {
  return ma._tag === "Right" ? none : some(ma.left)
}
