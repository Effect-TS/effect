import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as M from "../src/next/Managed"

pipe(
  M.effectTotal(() => {
    console.log("begin", new Date())
  }),
  M.chain(() =>
    M.sequenceTParN(2)(
      M.fromEffect(T.delay(500)(T.succeed(0))),
      M.fromEffect(T.delay(500)(T.succeed(1))),
      M.fromEffect(T.delay(500)(T.succeed(2))),
      M.fromEffect(T.delay(500)(T.succeed(4)))
    )
  ),
  M.onExitFirst(() =>
    T.effectTotal(() => {
      console.log("done", new Date())
    })
  ),
  M.use((x) =>
    T.effectTotal(() => {
      console.log(x)
    })
  ),
  T.runMain
)
