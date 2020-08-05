import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as S from "../src/next/Schedule/new"

let i = 0

const cumulativeElapsed = (f: (e: number) => boolean) =>
  pipe(
    S.elapsed,
    S.fold(0)((x, y) => x + y),
    S.check((_, os) => f(os))
  )

const program = pipe(
  T.suspend(() => {
    console.log(`called ${i}`)
    i++
    return i === 5 ? T.succeed(1) : T.fail("error")
  }),
  T.delay(3),
  T._retry(cumulativeElapsed((n) => n < 100)),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  )
)

T.runMain(program)
