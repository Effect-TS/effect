import "@effect-ts/tracing-utils/Enable"

import { pretty } from "./Cause"
import * as T from "./Effect"

T.succeed("no" as "ok" | "no")
  ["|>"](T.filterOrElse((a): a is "ok" => a === "ok", T.fail))
  ["|>"]((x) =>
    T.runPromiseExit(x).then((exit) => {
      switch (exit._tag) {
        case "Failure": {
          console.log(pretty(exit.cause))
          break
        }
        case "Success": {
          break
        }
      }
    })
  )
