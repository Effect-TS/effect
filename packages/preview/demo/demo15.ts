import * as A from "../src/Array"
import * as E from "../src/Either"
import { pipe, tuple } from "../src/Function"
import * as M from "../src/Map"
import { StringSum } from "../src/Newtype"
import * as Ord from "../src/Ord"
import * as S from "../src/String"

const traverse = M.getTraversable(Ord.ordNumber).foreachF(
  E.getValidationApplicative(S.SumIdentity)
)

pipe(
  A.range(0, 15),
  A.map((n) => tuple(n, n)),
  M.make,
  traverse((n) =>
    n < 10 ? E.right(n) : E.left(StringSum.wrap(`(n: ${n} is not < 10)`))
  ),
  (x) => {
    console.log(x)
  }
)
