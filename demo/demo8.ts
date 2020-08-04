import { pipe, introduce } from "../src/Function"
import * as T from "../src/next/Effect"
import * as S from "../src/next/Schedule"

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
    pipe(
      S.exponential(base, factor),
      S.zip(S.elapsed),
      S.whileOutput(([_, s]) => s < cap),
      S.tapOutput((n) =>
        T.effectTotal(() => {
          console.log(n)
        })
      )
    )
  )

export const fibonacciCapped = (o?: { base?: number; cap?: number }) =>
  introduce({
    base: o?.base || 100,
    cap: o?.cap || 5000
  })(({ base, cap }) =>
    pipe(
      S.fibonacci(base),
      S.fold(0)((z, n) => z + n),
      S.whileOutput((n) => n < cap),
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
    return r > 0.1 ? T.fail(`err: ${r}`) : T.succeed(i)
  }),
  T.retry(exponentialCapped({ base: 100, cap: 4000 })),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  )
)

T.runMain(program)
