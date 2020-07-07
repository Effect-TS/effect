import * as T from "../src/next/Effect"
import * as M from "../src/next/Managed"

export const man = M.onExitFirst_(
  M.fromEffect(
    T.effectTotal(() => {
      return 1
    })
  ),
  () =>
    T.effectTotal(() => {
      console.log("done")
    })
)

T.runMain(
  M.use_(man, (n) =>
    T.effectTotal(() => {
      console.log("using", n)
    })
  )
)
