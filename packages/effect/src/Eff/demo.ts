import { pipe } from "../Function"

import * as T from "./Effect"

let k = 0

pipe(
  T.foreachParN_(3)([0, 1, 2, 3, 4, 5], (n) =>
    T.effectAsync<unknown, never, number>((cb) => {
      k += 1
      setTimeout(() => {
        if (k <= 3) {
          k -= 1
        }
        cb(T.succeedNow(n + 1))
      }, 100)
    })
  ),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log("k", k)
      console.log("n", n)
    })
  ),
  T.unsafeRunMain
)
