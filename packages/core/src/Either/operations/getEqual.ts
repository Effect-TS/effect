// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"
import * as E from "@effect-ts/system/Either"

import type { Equal } from "../../Equal/index.js"

export function getEqual<E, A>(EL: Equal<E>, EA: Equal<A>): Equal<Either<E, A>> {
  return {
    equals: (x, y) =>
      x === y ||
      (E.isLeft(x)
        ? E.isLeft(y) && EL.equals(x.left, y.left)
        : E.isRight(y) && EA.equals(x.right, y.right))
  }
}
