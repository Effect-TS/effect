import * as A from "../src/Array"
import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as S from "../src/next/Stream"

const cancel = pipe(
  S.effectAsyncInterrupt<unknown, never, number>((cb) => {
    let i = 0
    const timer = setInterval(() => {
      cb(T.succeedNow(A.range(0, i)))
      i++
    }, 500)
    return T.effectTotal(() => {
      clearInterval(timer)
      console.log("cleared")
    })
  }),
  S.mapMPar(3)((n) =>
    T.delay(250)(
      T.effectTotal(() => {
        console.log(`process: ${n}`)
        return n
      })
    )
  ),
  S.runDrain,
  T.runMain
)

setTimeout(() => {
  cancel()
}, 10000)
