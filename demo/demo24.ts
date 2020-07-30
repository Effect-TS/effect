import * as A from "../src/Array"
import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as S from "../src/next/Stream"

pipe(
  S.fromArray(A.range(0, 10)),
  S.zipWithSeq(S.fromArray(A.range(10, 20)), (x, y) => x + y),
  S.mapM((n) =>
    T.effectTotal(() => {
      console.log(n)
      return n
    })
  ),
  S.runDrain,
  T.runMain
)
