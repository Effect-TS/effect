import { pipe, introduce } from "../../Function"
import * as T from "../Effect"
import * as S from "../Schedule"

let i = 0

// exponential capped
export const exponentialCapped = (o?: {
  base?: number
  factor?: number
  cap?: number
}) =>
  introduce({
    base: o?.base || 100,
    factor: o?.factor || 2,
    cap: o?.cap || 5000
  })(({ base, cap, factor }) =>
    pipe(S.exponential(base, factor), S.both(S.duration(cap)))
  )

export const fibonacciCapped = (o?: { base?: number; cap?: number }) =>
  introduce({
    base: o?.base || 100,
    cap: o?.cap || 5000
  })(({ base, cap }) =>
    pipe(
      S.fibonacci(base),
      S.both(S.duration(cap)),
      S.tapOutput((n) =>
        T.effectTotal(() => {
          console.log(n)
        })
      )
    )
  )

const program = pipe(
  T.suspend(() => {
    i += 1
    const r = Math.random()
    return r > 0.1 ? T.fail(`err: ${r}`) : T.succeedNow(i)
  }),
  T.retry(exponentialCapped({ base: 1000 })),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  )
)

T.runMain(program)
