import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import * as LogLevel from "../src/LogLevel"

pipe(
  T.log(() => "yay"),
  T.tap(() => T.logInfo(() => "ok")),
  T.tap(() => T.logWarning(() => "maybe")),
  LogLevel.locally(LogLevel.All),
  T.unsafeRunPromise
)
