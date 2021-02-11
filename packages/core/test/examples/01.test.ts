import { getCovariantComposition } from "@effect-ts/prelude/Covariant"
import { pipe } from "@effect-ts/system/Function"

import * as A from "../../src/Array"
import * as E from "../../src/Either"

test("01", () => {
  const F = getCovariantComposition(A.Covariant, E.Covariant)

  const result = pipe(
    [E.right(0), E.right(1), E.right(2)],
    F.map((n) => n + 1)
  )

  console.log(result)
})
