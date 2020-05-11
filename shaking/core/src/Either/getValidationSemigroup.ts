import type { Semigroup } from "../Semigroup"

import type { Either } from "./Either"
import { isLeft } from "./isLeft"
import { left } from "./left"
import { right } from "./right"

/**
 * @since 2.0.0
 */
export function getValidationSemigroup<E, A>(
  SE: Semigroup<E>,
  SA: Semigroup<A>
): Semigroup<Either<E, A>> {
  return {
    concat: (fx, fy) =>
      isLeft(fx)
        ? isLeft(fy)
          ? left(SE.concat(fx.left, fy.left))
          : fx
        : isLeft(fy)
        ? fy
        : right(SA.concat(fx.right, fy.right))
  }
}
