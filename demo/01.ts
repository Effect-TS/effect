import * as A from "../src/Classic/Array"
import * as E from "../src/Classic/Either"
import { getCovariantComposition } from "../src/Prelude"

import { pipe } from "@effect-ts/system/Function"

const F = getCovariantComposition(A.Covariant, E.Covariant)

pipe(
  [E.right(0), E.right(1), E.right(2)],
  F.map((n) => n + 1)
)
