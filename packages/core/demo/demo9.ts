import * as A from "../src/Array"
import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as S from "../src/next/Semaphore"

const program = pipe(
  S.makeSemaphore(2),
  T.chain((s) =>
    T.foreachPar_(A.range(0, 10), (n) =>
      S.withPermit(s)(
        T.delay(1000)(
          T.effectTotal(() => {
            console.log(`running ${n}`)
          })
        )
      )
    )
  )
)

T.runMain(program)
