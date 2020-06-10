import * as Z from "../src"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"

// work in progress
/* istanbul ignore file */

const program: T.Async<never> = T.forever(
  T.delay(
    T.sync(() => {
      console.log("process!!")
    }),
    3000
  )
)

const ZooClient = Z.Client({
  connectionString: "127.0.0.1:2181"
})

const ZooElection = Z.Election("/election/bbbb")

const Live = ZooElection.with(ZooClient)

pipe(
  program,
  Live.use,
  T.exitCode((ex) => {
    console.error("Exit:", ex)
  })
)
