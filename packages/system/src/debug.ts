import "@effect-ts/tracing-utils/Enable"

import * as T from "./Effect"
import { prettyTrace } from "./Fiber"
import { pipe } from "./Function"

pipe(
  T.succeed(0),
  T.andThen(T.succeed(1)),
  T.map((n) => n + 1),
  T.chain((n) => T.effectTotal(() => n + 2)),
  T.andThen(T.fail("ok")),
  T.catchAll((x) => T.succeed(x)),
  T.andThen(T.trace),
  T.chain((t) =>
    T.effectTotal(() => {
      console.log(prettyTrace(t))
    })
  ),
  T.runPromise
).catch(console.error)
