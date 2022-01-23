import * as T from "../src/Effect"
import * as LogLevel from "../src/LogLevel"

export const numbers = T.succeed(0) + T.succeed(1) + T.succeed(2)

export const program = numbers.flatMap(
  ({ tuple: [a, b, c] }) =>
    T.log(`yay: ${a}`) > T.logInfo(`ok: ${b}`) > T.logWarning(`maybe: ${c}`)
)

program.apply(LogLevel.locally(LogLevel.All)).unsafeRunPromise()
