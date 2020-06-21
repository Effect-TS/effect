import * as A from "../Array"
import { pipe } from "../Function"

import * as T from "./Effect"

export const cancel = pipe(
  T.foreachParN_(5)(A.range(0, 10), (n) =>
    T.effectAsyncInterrupt<unknown, string, number>((cb) => {
      const t = setTimeout(() => {
        if (n > 5) {
          cb(T.fail(`err: ${n}`))
        } else {
          cb(T.succeedNow(n + 1))
        }
      }, 200)

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
  T.unsafeRunMain
)

setTimeout(() => {
  //cancel()
}, 10)
