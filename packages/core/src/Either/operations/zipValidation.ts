// ets_tracing: off

import * as E from "@effect-ts/system/Either"

import type { Associative } from "../../Associative/index.js"
import { tuple } from "../../Function/index.js"

/**
 * Zip combining errors in case of multiple failures
 */
export function zipValidation<E>(
  A: Associative<E>
): <B>(fb: E.Either<E, B>) => <A>(fa: E.Either<E, A>) => E.Either<E, readonly [A, B]> {
  return (fb) =>
    E.fold(
      (ea) =>
        E.fold_(
          fb,
          (eb) => E.left(A.combine(ea, eb)),
          () => E.left(ea)
        ),
      (a) => E.fold_(fb, E.left, (b) => E.right(tuple(a, b)))
    )
}
