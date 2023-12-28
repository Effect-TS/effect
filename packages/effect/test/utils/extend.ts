import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as TestEnvironment from "effect/TestContext"
import type * as TestServices from "effect/TestServices"
import type { TestAPI } from "vitest"
import * as V from "vitest"

export type API = TestAPI<{}>

export const it: API = V.it

const TestEnv = TestEnvironment.TestContext.pipe(
  Layer.provide(Logger.remove(Logger.defaultLogger))
)

export const effect = (() => {
  const f = <E, A>(
    name: string,
    self: () => Effect.Effect<TestServices.TestServices, E, A>,
    timeout: number | V.TestOptions = 5_000
  ) => {
    return it(
      name,
      () =>
        pipe(
          Effect.suspend(self),
          Effect.provide(TestEnv),
          Effect.runPromise
        ),
      timeout
    )
  }
  return Object.assign(f, {
    skip: <E, A>(
      name: string,
      self: () => Effect.Effect<TestServices.TestServices, E, A>,
      timeout = 5_000
    ) => {
      return it.skip(
        name,
        () =>
          pipe(
            Effect.suspend(self),
            Effect.provide(TestEnv),
            Effect.runPromise
          ),
        timeout
      )
    },
    only: <E, A>(
      name: string,
      self: () => Effect.Effect<TestServices.TestServices, E, A>,
      timeout = 5_000
    ) => {
      return it.only(
        name,
        () =>
          pipe(
            Effect.suspend(self),
            Effect.provide(TestEnv),
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
    () =>
      pipe(
        Effect.suspend(self),
        Effect.runPromise
      ),
    timeout
  )
}

export const flakyTest = <R, E, A>(
  self: Effect.Effect<R, E, A>,
  timeout: Duration.Duration = Duration.seconds(30)
) => {
  return pipe(
    Effect.catchAllDefect(self, Effect.fail),
    Effect.retrySchedule(
      pipe(
        Schedule.recurs(10),
        Schedule.compose(Schedule.elapsed),
        Schedule.whileOutput(Duration.lessThanOrEqualTo(timeout))
      )
    ),
    Effect.orDie
  )
}

export const scoped = <E, A>(
  name: string,
  self: () => Effect.Effect<Scope.Scope | TestServices.TestServices, E, A>,
  timeout = 5_000
) => {
  return it(
    name,
    () =>
      pipe(
        Effect.suspend(self),
        Effect.scoped,
        Effect.provide(TestEnv),
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
      pipe(
        Effect.suspend(self),
        Effect.scoped,
        Effect.runPromise
      ),
    timeout
  )
}
