import * as T from "../../Effect"
import { tag } from "../../Has"
import * as L from "../../Layer"

export const LoggerId = Symbol.for("@effect-ts/system/Test/TestLoggerId")

export interface TestLogger {
  readonly serviceId: typeof LoggerId
  readonly logLine: (line: string) => T.UIO<void>
}

export const TestLogger = tag<TestLogger>().setKey(LoggerId)

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
