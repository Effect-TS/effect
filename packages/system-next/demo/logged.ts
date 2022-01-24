import { Either } from "../src/data/Either"
import { Effect } from "../src/io/Effect"
import * as LogLevel from "../src/io/LogLevel"

export const numbers = Effect.succeed(0) + Effect.succeed(1) + Effect.succeed(2)
export const numbersPar = Effect.succeed(0) & Effect.succeed(1) & Effect.succeed(2)

export const isPositive = (n: number) =>
  n > 0 ? Either.right("positive") : Either.left("negative")

export const isPositiveEff = (n: number) =>
  n > 0 ?S Effect.succeed("positive") : Effect.fail("negative")

export const switched = (n: number) => {
  switch (n) {
    case 0:
      return Effect.succeed(0 as const)
    case 1:
      return Effect.fail(1 as const)
    case 2:
      return Effect.succeed(2 as const)
    case 3:
      return Effect.fail(3 as const)
    case 4:
      return Effect.environmentWithEffect((r: { bar: string }) => Effect.die(r.bar))
    default:
      return Effect.environmentWithEffect((r: { foo: string }) => Effect.die(r.foo))
  }
}

export const message = isPositive(10).fold(
  (left) => `hello: ${left}`,
  (right) => `hello: ${right}`
)

export const program = (numbers + numbersPar).flatMap(
  ({ tuple: [a, b, c, d, e, f] }) =>
    Effect.log(`yay: ${a}`) >
    Effect.logInfo(`ok: ${b}`) >
    Effect.logWarning(`maybe: ${c}`) >
    Effect.log(`yay: ${d}`) >
    Effect.logInfo(`ok: ${e}`) >
    Effect.logWarning(`maybe: ${f}`)
)

export const executeOrDie = Effect.fail("error") | program

program.apply(LogLevel.locally(LogLevel.Error)).unsafeRunPromise()
