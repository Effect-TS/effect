import * as A from "../src/Classic/Array"
import * as E from "../src/Classic/Either"
import * as EitherT from "../src/Classic/EitherT"
import { pipe } from "../src/Function"
import { chainF } from "../src/Prelude/DSL"
import * as R from "../src/Pure/Reader"
import * as ReaderT from "../src/Pure/ReaderT"

const M = pipe(A.Monad, EitherT.monad(), ReaderT.monad())

pipe(
  R.access((k: number) => A.range(0, 10).map((n) => E.right(n + k))),
  chainF(M)((n) => R.succeed([E.right(n + 1)])),
  R.runEnv(10),
  (x) => {
    console.log(x)
  }
)
