import * as A from "../src/Classic/Array"
import * as E from "../src/Classic/Either"
import { getEitherM } from "../src/Classic/EitherT"
import { pipe } from "../src/Function"
import { chainF } from "../src/Prelude/DSL"

const M = getEitherM(A.Monad)

pipe(
  A.range(0, 10).map(E.right),
  chainF(M)((n) => [E.right(n + 1)]),
  (x) => {
    console.log(x)
  }
)
