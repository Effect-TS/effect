import * as A from "../src/Array"
import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"

export const cancel = pipe(
  T.foreachParN_(5)(A.range(0, 10), (n) =>
    T.effectAsyncInterrupt<unknown, string, number>((cb) => {
      const t = setTimeout(
        () => {
          if (n > 3) {
            cb(T.fail(`failure: ${n}`))
          } else {
            cb(T.succeed(n + 1))
          }
        },
        n < 3 ? 1000 : 200
      )

      return T.chain_(
        T.effectTotal(() => {
          clearTimeout(t)
        }),
        () => T.die(`interruption error: ${n}`)
      )
    })
  ),
  T.tap((ns) =>
    T.effectTotal(() => {
      console.log(ns)
    })
  ),
  T.runMain
)

setTimeout(() => {
  cancel()
}, 10)
