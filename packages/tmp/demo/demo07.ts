import { accessMF } from "../src/_abstract/DSL"
import { pipe } from "../src/Function"
import * as R from "../src/Reader"

const result = pipe(
  accessMF(R.Environmental)((r: number) => R.succeed(r + 1)),
  R.runEnv(10)
)

console.log(result)
