import * as A from "../../src/_new/Classic/Array"
import * as E from "../../src/_new/Classic/Either"
import { getCovariantComposition } from "../../src/_new/Prelude"
import { pipe } from "../../src/Function"

const F = getCovariantComposition(A.Covariant, E.Covariant)

pipe(
  [E.right(0), E.right(1), E.right(2)],
  F.map((n) => n + 1)
)
