import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as S from "../src/next/Schedule"

let i = 0

const policy = pipe(
  S.fixed(0),
  S.delayedM((ms) => T.succeedNow(ms * 2))
)

const program = pipe(
  T.suspend(() => {
    i += 1
    const r = Math.random()
    return r > 0.1 ? T.fail(r) : T.succeedNow(i)
  }),
  T.retry(policy),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  )
)

T.runMain(program)
