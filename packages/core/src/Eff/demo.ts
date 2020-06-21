import * as A from "../Array"
import { pipe } from "../Function"

import * as T from "./Effect"

pipe(
  T.foreachParN_(5)(A.range(0, 100), (n) =>
    T.effectAsync<unknown, string, number>((cb) => {
      setTimeout(() => {
        if (n > 2) {
          cb(T.fail(`err: ${n}`))
        } else {
          cb(T.succeedNow(n + 1))
        }
      }, 200)
    })
  ),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  ),
  T.unsafeRunMain
)
