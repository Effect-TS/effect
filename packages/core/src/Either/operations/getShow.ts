// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"
import * as E from "@effect-ts/system/Either"

import type { Show } from "../../Show/index.js"

/**
 * Get `Show` for `Either` given `Show` of `E` & `A`
 */
export function getShow<E, A>(SE: Show<E>, SA: Show<A>): Show<Either<E, A>> {
  return {
    show: (ma) =>
      E.isLeft(ma) ? `left(${SE.show(ma.left)})` : `right(${SA.show(ma.right)})`
  }
}
