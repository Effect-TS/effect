import { Effect } from "../src/Effect"
import * as LogLevel from "../src/LogLevel"

export const numbers = Effect.succeed(0) + Effect.succeed(1) + Effect.succeed(2)
export const numbersPar = Effect.succeed(0) & Effect.succeed(1) & Effect.succeed(2)

export const program = (numbers + numbersPar).flatMap(
  ({ tuple: [a, b, c, d, e, f] }) =>
    Effect.log(`yay: ${a}`) >
    Effect.logInfo(`ok: ${b}`) >
    Effect.logWarning(`maybe: ${c}`) >
    Effect.log(`yay: ${d}`) >
    Effect.logInfo(`ok: ${e}`) >
    Effect.logWarning(`maybe: ${f}`)
)

program.apply(LogLevel.locally(LogLevel.All)).unsafeRunPromise()
