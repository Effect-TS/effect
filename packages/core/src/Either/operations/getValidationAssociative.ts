// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"
import * as E from "@effect-ts/system/Either"

import type { Associative } from "../../Associative/index.js"
import { makeAssociative } from "../../Associative/index.js"

/**
 * Get an `Associative` instance for `Either` that combines both success and failure
 * given `Associative` of `A` & `E`.
 */
export function getValidationAssociative<E, A>(
  SE: Associative<E>,
  SA: Associative<A>
): Associative<Either<E, A>> {
  return makeAssociative((fx, fy) =>
    E.isLeft(fx)
      ? E.isLeft(fy)
        ? E.left(SE.combine(fx.left, fy.left))
        : fx
      : E.isLeft(fy)
      ? fy
      : E.right(SA.combine(fx.right, fy.right))
  )
}
