import "@effect-ts/tracing-utils/Enable"

import * as T from "./Effect"
import { prettyTrace } from "./Fiber"
import { pipe } from "./Function"

pipe(
  T.tupleParN(2)(T.succeed(0), T.succeed(1), T.fail(2)),
  T.andThen(T.trace),
  T.chain((t) =>
    T.effectTotal(() => {
      console.log(prettyTrace(t))
    })
  ),
  T.runPromise
).catch(console.error)
