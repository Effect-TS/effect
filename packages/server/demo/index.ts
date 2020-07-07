import { appLayer } from "./use"

import { pipe } from "@matechs/core/Function"
import * as T from "@matechs/core/next/Effect"

// run the app
const cancel = pipe(T.never, T.provideSomeLayer(appLayer), T.runMain)

// cancel on SIGINT & SIGTERM
process.on("SIGINT", () => {
  cancel()
})
process.on("SIGTERM", () => {
  cancel()
})
