import { inspect } from "util"

import * as EX from "../src"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import { Empty } from "@matechs/core/Layer"

const App = Empty.withMany(
  EX.Route(
    "get",
    "/",
    T.pure(
      EX.routeResponse(200)({
        message: "OK"
      })
    )
  )
)

pipe(App.with(EX.Express(8081)).use(T.waitProcessExit), T.runToPromise)
  .then(() => {
    console.log("App exit completed")
  })
  .catch((error) => {
    console.error(inspect(error, true, 10))
    process.exit(2)
  })
