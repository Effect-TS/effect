import { pipe } from "@effect-ts/system/Function"

import * as A from "../../src/Collections/Immutable/Array/index.js"
import * as E from "../../src/Either/index.js"
import { getCovariantComposition } from "../../src/PreludeV2/Covariant/index.js"

test("01", () => {
  const F = getCovariantComposition(A.Covariant, E.Covariant)

  const result: A.Array<E.Either<never, number>> = pipe(
    [E.right(0), E.right(1), E.right(2)],
    F.map((n) => n + 1)
  )

  expect(result).toEqual([E.right(1), E.right(2), E.right(3)])
})
