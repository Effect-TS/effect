import * as A from "../src/Array"
import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"

export const cancel = pipe(
  T.foreachPar_(A.range(0, 10), (n) =>
    T.effectAsyncInterrupt<unknown, string, number>((cb) => {
      const t = setTimeout(
        () => {
          if (n > 3) {
            cb(T.fail(`err: ${n}`))
          } else {
            cb(T.succeedNow(n + 1))
          }
        },
        n < 5 ? 1000 : 200
      )

      return T.chain_(
        T.effectTotal(() => {
          clearTimeout(t)
        }),
        () => T.die(`err-int: ${n}`)
      )
    })
  ),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  ),
  T.runMain
)

setTimeout(() => {
  //cancel()
}, 10)
