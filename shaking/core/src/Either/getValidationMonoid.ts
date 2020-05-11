import type { Monoid } from "../Monoid"
import type { Semigroup } from "../Semigroup"

import type { Either } from "./Either"
import { getValidationSemigroup } from "./getValidationSemigroup"
import { right } from "./right"

/**
 * @since 2.0.0
 */
export function getValidationMonoid<E, A>(
  SE: Semigroup<E>,
  SA: Monoid<A>
): Monoid<Either<E, A>> {
  return {
    concat: getValidationSemigroup(SE, SA).concat,
    empty: right(SA.empty)
  }
}
