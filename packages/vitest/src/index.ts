/**
 * @since 1.0.0
 */
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

/**
 * @since 1.0.0
 */
export type API = TestAPI<{}>

/**
 * @since 1.0.0
 */
export const it: API = V.it

const TestEnv = TestEnvironment.TestContext.pipe(
  Layer.provide(Logger.remove(Logger.defaultLogger))
)

/**
 * @since 1.0.0
 */
export const effect = (() => {
  const f = <E, A>(
    name: string,
    self:
      | Effect.Effect<A, E, TestServices.TestServices>
      | ((ctx: V.TaskContext<V.Test<{}>> & V.TestContext) => Effect.Effect<A, E, TestServices.TestServices>),
    timeout: number | V.TestOptions = 5_000
  ) =>
    it(
      name,
      (ctx) =>
        pipe(
          Effect.isEffect(self) ? self : self(ctx),
          Effect.provide(TestEnv),
          Effect.runPromise
        ),
      timeout
    )
  return Object.assign(f, {
    skip: <E, A>(
      name: string,
      self:
        | Effect.Effect<A, E, TestServices.TestServices>
        | ((ctx: V.TaskContext<V.Test<{}>> & V.TestContext) => Effect.Effect<A, E, TestServices.TestServices>),
      timeout = 5_000
    ) =>
      it.skip(
        name,
        (ctx) =>
          pipe(
            Effect.isEffect(self) ? self : self(ctx),
            Effect.provide(TestEnv),
            Effect.runPromise
          ),
        timeout
      ),
    only: <E, A>(
      name: string,
      self: Effect.Effect<A, E, TestServices.TestServices> | (() => Effect.Effect<A, E, TestServices.TestServices>),
      timeout = 5_000
    ) =>
      it.only(
        name,
        () =>
          pipe(
            Effect.isEffect(self) ? self : Effect.suspend(self),
            Effect.provide(TestEnv),
            Effect.runPromise
          ),
        timeout
      )
  })
})()

/**
 * @since 1.0.0
 */
export const live = <E, A>(
  name: string,
  self: Effect.Effect<A, E> | ((ctx: V.TaskContext<V.Test<{}>> & V.TestContext) => Effect.Effect<A, E>),
  timeout = 5_000
) =>
  it(
    name,
    (ctx) =>
      pipe(
        Effect.isEffect(self) ? self : self(ctx),
        Effect.runPromise
      ),
    timeout
  )

/**
 * @since 1.0.0
 */
export const flakyTest = <A, E, R>(
  self: Effect.Effect<A, E, R>,
  timeout: Duration.Duration = Duration.seconds(30)
) =>
  pipe(
    Effect.catchAllDefect(self, Effect.fail),
    Effect.retry(
      pipe(
        Schedule.recurs(10),
        Schedule.compose(Schedule.elapsed),
        Schedule.whileOutput(Duration.lessThanOrEqualTo(timeout))
      )
    ),
    Effect.orDie
  )

/**
 * @since 1.0.0
 */
export const scoped = <E, A>(
  name: string,
  self:
    | Effect.Effect<A, E, Scope.Scope | TestServices.TestServices>
    | ((
      ctx: V.TaskContext<V.Test<{}>> & V.TestContext
    ) => Effect.Effect<A, E, Scope.Scope | TestServices.TestServices>),
  timeout = 5_000
) =>
  it(
    name,
    (ctx) =>
      pipe(
        Effect.isEffect(self) ? self : self(ctx),
        Effect.scoped,
        Effect.provide(TestEnv),
        Effect.runPromise
      ),
    timeout
  )

/**
 * @since 1.0.0
 */
export const scopedLive = <E, A>(
  name: string,
  self:
    | Effect.Effect<A, E, Scope.Scope>
    | ((ctx: V.TaskContext<V.Test<{}>> & V.TestContext) => Effect.Effect<A, E, Scope.Scope>),
  timeout = 5_000
) =>
  it(
    name,
    (ctx) =>
      pipe(
        Effect.isEffect(self) ? self : self(ctx),
        Effect.scoped,
        Effect.runPromise
      ),
    timeout
  )
