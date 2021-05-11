import * as T from "../../Effect"
import { tag } from "../../Has"
import * as L from "../../Layer"

export interface TestLogger {
  readonly logLine: (line: string) => T.UIO<void>
}

export const TestLogger = tag<TestLogger>()

export const FromConsole = L.fromEffect(TestLogger)(
  T.succeedWith(() => ({
    logLine: (msg) =>
      T.succeedWith(() => {
        console.log(msg)
      })
  }))
)

export const { logLine } = T.deriveLifted(TestLogger)(["logLine"], [], [])
