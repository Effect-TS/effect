import { pipe } from "../Function"

import * as T from "./Effect"

export const cancel = T.unsafeRunMain(
  pipe(
    T.foreachPar_([0, 1, 2, 3, 4], (n) =>
      n === 5
        ? T.delay(10)(T.die("error"))
        : T.effectAsyncInterrupt<unknown, never, number>((cb) => {
            const t = setTimeout(() => {
              cb(T.succeedNow(n + 1))
            }, 200)
            return T.chain_(
              T.effectTotal(() => {
                clearTimeout(t)
              }),
              () => T.die(`err: ${n}`)
            )
          })
    ),
    T.chain((n) =>
      T.effectTotal(() => {
        console.log(n)
      })
    )
  )
)

//cancel()

/*T.unsafeRunMain(
  pipe(
    T.zipWithPar_(
      T.delay(10)(T.succeedNow(1)),
      T.delay(15)(T.succeedNow(2)),
      (a, b) => a + b
    ),
    T.chain((n) =>
      T.effectTotal(() => {
        console.log(n)
      })
    )
  )
)*/
