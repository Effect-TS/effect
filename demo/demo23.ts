import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as S from "../src/next/Stream"

const cancel = pipe(
  S.effectAsyncInterrupt<unknown, never, number>((cb) => {
    let i = 0
    const timer = setInterval(() => {
      cb(T.succeedNow([i]))
      i++
    }, 100)
    return T.effectTotal(() => {
      clearInterval(timer)
      console.log("cleared")
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

setTimeout(() => {
  cancel()
}, 2000)
