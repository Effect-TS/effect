import * as A from "../src/Classic/Array"
import * as E from "../src/Classic/Either"
import { getEitherM } from "../src/Classic/EitherT"
import { pipe } from "../src/Function"
import { chainF } from "../src/Prelude/DSL"
import * as R from "../src/Pure/Reader"
import { getReaderM } from "../src/Pure/ReaderT"

const M = pipe(A.Monad, getEitherM(), getReaderM())

pipe(
  R.access((k: number) => A.range(0, 10).map((n) => E.right(n + k))),
  chainF(M)((n) => R.succeed([E.right(n + 1)])),
  R.runEnv(10),
  (x) => {
    console.log(x)
  }
)
