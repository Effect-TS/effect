import type { Eq } from "../Eq"

import type { Either } from "./Either"
import { isLeft } from "./isLeft"
import { isRight } from "./isRight"

/**
 * @since 2.0.0
 */
export function getEq<E, A>(EL: Eq<E>, EA: Eq<A>): Eq<Either<E, A>> {
  return {
    equals: (x, y) =>
      x === y ||
      (isLeft(x)
        ? isLeft(y) && EL.equals(x.left, y.left)
        : isRight(y) && EA.equals(x.right, y.right))
  }
}
