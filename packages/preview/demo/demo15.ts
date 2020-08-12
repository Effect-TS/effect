import * as A from "../src/Array"
import * as E from "../src/Either"
import { pipe, tuple } from "../src/Function"
import * as M from "../src/Map"
import { StringSum, Sum } from "../src/Newtype"
import * as Ord from "../src/Ord"
import * as S from "../src/String"
import { intersect } from "../src/Utils"
import { mapErrorF } from "../src/_abstract/DSL"

const F = intersect(
  E.getValidationApplicative(S.SumIdentity),
  E.getValidationFail<Sum<string>>(),
  E.getValidationRecover<Sum<string>>()
)

const traverse = M.makeForeachWithKeysF(Ord.ordNumber)(F)
const mapError = mapErrorF(F)

pipe(
  A.range(0, 15),
  A.map((n) => tuple(n, n)),
  M.make,
  traverse((n, k) =>
    n < 10 ? E.right(n) : E.left(StringSum.wrap(`(n: ${n} is not < 10 @ k = ${k})`))
  ),
  mapError((s) => StringSum.wrap(`*** ${StringSum.unwrap(s)} ***`)),
  (x) => {
    console.log(x)
  }
)
