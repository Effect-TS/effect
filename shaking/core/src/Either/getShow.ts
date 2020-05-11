import type { Show } from "../Show"

import type { Either } from "./Either"
import { isLeft } from "./isLeft"

/**
 * @since 2.0.0
 */
export function getShow<E, A>(SE: Show<E>, SA: Show<A>): Show<Either<E, A>> {
  return {
    show: (ma) =>
      isLeft(ma) ? `left(${SE.show(ma.left)})` : `right(${SA.show(ma.right)})`
  }
}
