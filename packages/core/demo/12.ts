import * as A from "../src/Classic/Array"
import { pipe } from "../src/Function"
import { chainF } from "../src/Prelude/DSL"
import * as R from "../src/Pure/Reader"
import { getReaderM } from "../src/Pure/ReaderT"

const M = pipe(A.Monad, getReaderM("X"), getReaderM("I"))

pipe(
  R.access((h: string) =>
    R.access((k: number) => A.range(0, 10).map((n) => n + k + h.length))
  ),
  chainF(M)((n) => R.succeed(R.succeed([n + 1]))),
  R.runEnv("hello"),
  R.runEnv(10),
  (x) => {
    console.log(x)
  }
)
