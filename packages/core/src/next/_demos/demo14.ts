import * as T from "../Effect"
import * as M from "../Managed"

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
