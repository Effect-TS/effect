// ets_tracing: off

import * as T from "../../Effect/index.js"
import { tag } from "../../Has/index.js"
import * as L from "../../Layer/index.js"

export const LoggerId = Symbol.for("@effect-ts/system/Test/TestLoggerId")

export interface TestLogger {
  readonly serviceId: typeof LoggerId
  readonly logLine: (line: string) => T.UIO<void>
}

export const TestLogger = tag<TestLogger>(LoggerId)

export const FromConsole = L.fromEffect(TestLogger)(
  T.succeedWith(() => ({
    serviceId: LoggerId,
    logLine: (msg) =>
      T.succeedWith(() => {
        console.log(msg)
      })
  }))
)

export const { logLine } = T.deriveLifted(TestLogger)(["logLine"], [], [])
