import * as A from "../Array"
import { pipe } from "../Function"

import * as T from "./Effect"

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
