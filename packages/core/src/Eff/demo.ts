import { pipe } from "../Function"

import * as T from "./Effect"

/*export const cancel = T.unsafeRunMain(
  pipe(
    T.foreach_([0, 1, 2, 4], (n) => T.succeedNow(n + 1)),
    T.chain((n) =>
      T.effectTotal(() => {
        console.log(n)
      })
    )
  )
)*/

//cancel()

T.unsafeRunMain(
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
)
