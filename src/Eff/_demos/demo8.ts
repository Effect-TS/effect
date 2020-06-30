import { pipe } from "../../Function"
import * as T from "../Effect"
import * as S from "../Schedule"

let i = 0

// exponential capped
const policy = pipe(
  S.exponential(100),
  S.untilOutput((n) => n > 5000)
)

const program = pipe(
  T.suspend(() => {
    i += 1
    const r = Math.random()
    return r > 0.1 ? T.fail(`err: ${r}`) : T.succeedNow(i)
  }),
  T.retry(policy),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  )
)

T.runMain(program)
