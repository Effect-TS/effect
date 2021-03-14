import "@effect-ts/tracing-utils/Enable"

import * as T from "./Effect"
import { prettyTrace } from "./Fiber"
import { literal } from "./Function"

T.succeed("no")
  ["|>"](
    T.filterOrElse(
      (a): a is "ok" => a === "ok",
      () => T.succeed(literal("no"))
    )
  )
  ["|>"](T.andThen(T.trace))
  ["|>"](
    T.chain((trace) =>
      T.effectTotal(() => {
        console.log(prettyTrace(trace))
      })
    )
  )
  ["|>"]((x) => T.runPromise(x).catch(console.error))
