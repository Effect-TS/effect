import { pipe } from "../../src/Function"
import * as R from "../../src/next/Prelude/Reader"
import { accessMF } from "../../src/next/Prelude/abstract/Contextual"

const result = pipe(
  accessMF(R.Contextual)((r: number) => R.succeed(r + 1)),
  R.runEnv(10)
)

console.log(result)
