import { range } from "../src/Array"
import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"

pipe(
  range(0, 10),
  T.validate((n) => (n > 8 ? T.fail(`error: ${n}`) : T.succeedNow(n))),
  T.runMain
)
