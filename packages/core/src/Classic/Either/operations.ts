import * as E from "@effect-ts/system/Either"
import { pipe, tuple } from "@effect-ts/system/Function"

import type { EitherURI } from "../../Modules"
import * as P from "../../Prelude"
import * as DSL from "../../Prelude/DSL"
import type { Associative } from "../Associative"
import type { V } from "./definition"

export * from "@effect-ts/system/Either"

export function zipValidation<E>(
  A: Associative<E>
): <B>(fb: E.Either<E, B>) => <A>(fa: E.Either<E, A>) => E.Either<E, readonly [A, B]> {
  return (fb) =>
    E.fold(
      (ea) =>
        E.fold_(
          fb,
          (eb) => E.left(A.combine(eb)(ea)),
          () => E.left(ea)
        ),
      (a) => E.fold_(fb, E.left, (b) => E.right(tuple(a, b)))
    )
}

export const foreachF = P.implementForeachF<
  [EitherURI],
  V
>()((_) => (G) => (f) => (fa) =>
  E.isLeft(fa) ? DSL.succeedF(G)(fa) : pipe(f(fa.right), G.map(E.right))
)
