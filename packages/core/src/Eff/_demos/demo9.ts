import * as A from "../../Array"
import { pipe } from "../../Function"
import * as T from "../Effect"
import * as S from "../Semaphore"

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
