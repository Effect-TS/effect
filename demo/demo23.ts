import * as A from "../src/Array"
import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as M from "../src/next/Managed"
import * as S from "../src/next/Stream"
import * as TR from "../src/next/Stream/transducer"

pipe(
  S.fromArray(A.range(0, 3)),
  S.chain((n) => S.fromArray(A.range(0, n))),
  S.mapM((n) =>
    pipe(
      T.effectTotal(() => {
        console.log(`process: ${n}`)
      }),
      T.chain(() => T.effectTotal(() => n + 1)),
      T.tap(() => T.fail("error"))
    )
  ),
  S.catchAllCause(() => S.fromArray(A.range(10, 15))),
  S.aggregate(
    TR.makeTransducer(
      M.fromEffect(
        T.succeedNow((c) =>
          T.succeedNow(c._tag === "Some" ? A.chunksOf(2)(c.value) : [])
        )
      )
    )
  ),
  S.runCollect,
  T.chain((ns) =>
    T.effectTotal(() => {
      console.log(`final: ${JSON.stringify(ns)}`)
    })
  ),
  T.runMain
)
