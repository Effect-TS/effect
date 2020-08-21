import { pipe } from "@effect-ts/system/Function"

import * as A from "../src/Classic/Array"
import * as E from "../src/Classic/Either"
import { getCovariantComposition } from "../src/Prelude/Covariant"

test("01", () => {
  const F = getCovariantComposition(A.Covariant, E.Covariant)

  const result = pipe(
    [E.right(0), E.right(1), E.right(2)],
    F.map((n) => n + 1)
  )

  console.log(result)
})
