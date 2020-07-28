import { pipe } from "../src/Function"
import * as O from "../src/Option"
import * as T from "../src/next/Effect"
import * as S from "../src/next/Stream"

pipe(
  S.effectAsync<unknown, never, number>((cb) => {
    let i = 0
    const timer = setInterval(() => {
      if (i > 10) {
        clearInterval(timer)
        cb(T.fail(O.none))
      } else {
        cb(T.succeedNow([i]))
      }
      i++
    })
  }),
  S.mapM((n) =>
    T.effectTotal(() => {
      console.log(`process: ${n}`)
      return n
    })
  ),
  S.runCollect,
  T.chain((ns) =>
    T.effectTotal(() => {
      console.log(`result: ${JSON.stringify(ns)}`)
    })
  ),
  T.runMain
)
