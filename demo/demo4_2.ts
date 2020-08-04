import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as S from "../src/next/Schedule/new"

let i = 0

const policy = pipe(
  S.forever,
  S.collectAll,
  S.check((_, o) => o.length < 5)
)

const program = pipe(
  T.suspend(() => {
    console.log(`called ${i}`)
    i++
    return i === 6 ? T.succeed(1) : T.fail("error")
  }),
  T._retry(policy),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  )
)

T.runMain(program)
