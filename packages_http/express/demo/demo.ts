import { inspect } from "util"

import * as EX from "../src"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"

const program = pipe(
  EX.route(
    "get",
    "/",
    T.pure(
      EX.routeResponse(200)({
        message: "OK"
      })
    )
  ),
  T.chain(() => T.never)
)

pipe(
  EX.Express(8081).use(program),
  T.exitCode(
    T.foldExitCode(
      () => {
        console.log("Process correctly exited.")
      },
      (_) => {
        console.error("Process completed with:")
        console.error(_)
      },
      (_) => {
        console.error("Process errored with:")
        console.error(inspect(_, true, 10))
      }
    )
  )
)
