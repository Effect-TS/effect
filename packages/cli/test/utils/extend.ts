import * as Terminal from "@effect/cli/Terminal"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as TestEnvironment from "effect/TestContext"
import type * as TestServices from "effect/TestServices"
import type { TestAPI } from "vitest"
import * as V from "vitest"

export type API = TestAPI<{}>

export const it: API = V.it

const testLayer = Layer.merge(TestEnvironment.TestContext, Terminal.layer)

export const effect = (() => {
  const f = <E, A>(
    name: string,
    self: () => Effect.Effect<TestServices.TestServices | Terminal.Terminal, E, A>,
    timeout = 5_000
  ) => {
    return it(
      name,
      () =>
        Effect.suspend(self).pipe(
          Effect.provide(testLayer),
          Effect.runPromise
        ),
      timeout
    )
  }
  return Object.assign(f, {
    skip: <E, A>(
      name: string,
      self: () => Effect.Effect<TestServices.TestServices | Terminal.Terminal, E, A>,
      timeout = 5_000
    ) => {
      return it.skip(
        name,
        () =>
          Effect.suspend(self).pipe(
            Effect.provide(testLayer),
            Effect.runPromise
          ),
        timeout
      )
    },
    only: <E, A>(
      name: string,
      self: () => Effect.Effect<TestServices.TestServices | Terminal.Terminal, E, A>,
      timeout = 5_000
    ) => {
      return it.only(
        name,
        () =>
          Effect.suspend(self).pipe(
            Effect.provide(testLayer),
            Effect.runPromise
          ),
        timeout
      )
    }
  })
})()

export const live = <E, A>(
  name: string,
  self: () => Effect.Effect<never, E, A>,
  timeout = 5_000
) => {
  return it(
    name,
    () => Effect.suspend(self).pipe(Effect.runPromise),
    timeout
  )
}

export const flakyTest = <R, E, A>(
  self: Effect.Effect<R, E, A>,
  timeout: Duration.Duration = Duration.seconds(30)
) => {
  return Effect.catchAllDefect(self, Effect.fail).pipe(
    Effect.retry(
      Schedule.recurs(10).pipe(
        Schedule.compose(Schedule.elapsed),
        Schedule.whileOutput(Duration.lessThanOrEqualTo(timeout))
      )
    ),
    Effect.orDie
  )
}

export const scoped = <E, A>(
  name: string,
  self: () => Effect.Effect<Scope.Scope | TestServices.TestServices | Terminal.Terminal, E, A>,
  timeout = 5_000
) => {
  return it(
    name,
    () =>
      Effect.suspend(self).pipe(
        Effect.scoped,
        Effect.provide(testLayer),
        Effect.runPromise
      ),
    timeout
  )
}

export const scopedLive = <E, A>(
  name: string,
  self: () => Effect.Effect<Scope.Scope, E, A>,
  timeout = 5_000
) => {
  return it(
    name,
    () =>
      Effect.suspend(self).pipe(
        Effect.scoped,
        Effect.runPromise
      ),
    timeout
  )
}
