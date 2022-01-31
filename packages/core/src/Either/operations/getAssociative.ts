// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"
import * as E from "@effect-ts/system/Either"

import type { Associative } from "../../Associative/index.js"
import { makeAssociative } from "../../Associative/index.js"

/**
 * Get `Associative` for `Either` given `Associative` of `A`
 */
export function getAssociative<E, A>(S: Associative<A>): Associative<Either<E, A>> {
  return makeAssociative((x, y) =>
    E.isLeft(y) ? x : E.isLeft(x) ? y : E.right(S.combine(x.right, y.right))
  )
}
