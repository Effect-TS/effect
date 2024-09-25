/**
 * @since 1.0.0
 */
import type { Tester, TesterContext } from "@vitest/expect"
import * as Cause from "effect/Cause"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { flow, identity, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import type * as ManagedRuntime from "effect/ManagedRuntime"
import * as Runtime from "effect/Runtime"
import * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as TestEnvironment from "effect/TestContext"
import type * as TestServices from "effect/TestServices"
import * as Utils from "effect/Utils"
import * as V from "vitest"
import type * as Vitest from "./index.js"

/** @internal */
const handleExit = <E, A>(exit: Exit.Exit<E, A>): Effect.Effect<() => void, never, never> =>
  Effect.gen(function*() {
    if (Exit.isSuccess(exit)) {
      return () => {}
    } else {
      const errors = Cause.prettyErrors(exit.cause)
      for (let i = 1; i < errors.length; i++) {
        yield* Effect.logError(errors[i])
      }
      return () => {
        throw errors[0]
      }
    }
  })

/** @internal */
const runHook = <E, A>(effect: Effect.Effect<A, E>) =>
  Effect.gen(function*() {
    const exit = yield* Effect.exit(effect)
    return yield* handleExit(exit)
  }).pipe(Effect.runPromise).then((f) => f())

/** @internal */
const runTest = (ctx: Vitest.TaskContext) => <E, A>(effect: Effect.Effect<A, E>) =>
  Effect.gen(function*() {
    const exitFiber = yield* Effect.fork(Effect.exit(effect))
    const runtime = yield* Effect.runtime()

    ctx.onTestFinished(() =>
      Fiber.interrupt(exitFiber).pipe(
        Effect.asVoid,
        Runtime.runPromise(runtime)
      )
    )

    const exit = yield* Fiber.join(exitFiber)
    return yield* handleExit(exit)
  }).pipe(Effect.runPromise).then((f) => f())

/** @internal */
const TestEnv = TestEnvironment.TestContext.pipe(
  Layer.provide(Logger.remove(Logger.defaultLogger))
)

/** @internal */
function customTester(this: TesterContext, a: unknown, b: unknown, customTesters: Array<Tester>) {
  if (!Equal.isEqual(a) || !Equal.isEqual(b)) {
    return undefined
  }
  return Utils.structuralRegion(
    () => Equal.equals(a, b),
    (x, y) => this.equals(x, y, customTesters.filter((t) => t !== customTester))
  )
}

/** @internal */
export const addEqualityTesters = () => {
  V.expect.addEqualityTesters([customTester])
}

/** @internal */
export const beforeAll = <E>(
  self: (
    suite: Readonly<V.RunnerTestSuite | V.RunnerTestFile>
  ) => Effect.Effect<V.HookCleanupCallback | PromiseLike<V.HookCleanupCallback>, E, never>
): void => V.beforeAll((suite) => runHook(self(suite)))

/** @internal */
export const beforeEach = <E>(
  self: (
    ctx: V.TaskContext<V.RunnerCustomCase<object> | V.RunnerTestCase<object>> & V.TestContext & object,
    suite: V.RunnerTestSuite
  ) => Effect.Effect<V.HookCleanupCallback | PromiseLike<V.HookCleanupCallback>, E, never>
): void => V.beforeEach((ctx, suite) => runHook(self(ctx, suite)))

/** @internal */
export const afterAll = <E>(
  self: (suite: Readonly<V.RunnerTestSuite | V.RunnerTestFile>) => Effect.Effect<void | PromiseLike<void>, E, never>
): void => V.afterAll((suite) => runHook(self(suite)))

/** @internal */
export const afterEach = <E>(
  self: (
    ctx: V.TaskContext<V.RunnerCustomCase<object> | V.RunnerTestCase<object>> & V.TestContext & object,
    suite: V.RunnerTestSuite
  ) => Effect.Effect<void | PromiseLike<void>, E, never>
): void => V.afterEach((ctx, suite) => runHook(self(ctx, suite)))

/** @internal */
const makeTester = <R, E2 = never>(
  mapEffect: <A, E1>(self: Effect.Effect<A, E1, R>) => Effect.Effect<A, E1 | E2, never>
): Vitest.Vitest.Tester<R> => {
  const run = <A, E, TestArgs extends Array<unknown>>(
    ctx: V.TaskContext<V.RunnerTestCase<object>> & V.TestContext & object,
    args: TestArgs,
    self: Vitest.Vitest.TestFunction<A, E, R, TestArgs>
  ) => pipe(Effect.suspend(() => self(...args)), mapEffect, runTest(ctx))

  const f: Vitest.Vitest.Test<R> = (name, self, timeout) => V.it(name, (ctx) => run(ctx, [ctx], self), timeout)

  const skip: Vitest.Vitest.Tester<R>["only"] = (name, self, timeout) =>
    V.it.skip(name, (ctx) => run(ctx, [ctx], self), timeout)
  const skipIf: Vitest.Vitest.Tester<R>["skipIf"] = (condition) => (name, self, timeout) =>
    V.it.skipIf(condition)(name, (ctx) => run(ctx, [ctx], self), timeout)
  const runIf: Vitest.Vitest.Tester<R>["runIf"] = (condition) => (name, self, timeout) =>
    V.it.runIf(condition)(name, (ctx) => run(ctx, [ctx], self), timeout)
  const only: Vitest.Vitest.Tester<R>["only"] = (name, self, timeout) =>
    V.it.only(name, (ctx) => run(ctx, [ctx], self), timeout)
  const each: Vitest.Vitest.Tester<R>["each"] = (cases) => (name, self, timeout) =>
    V.it.for(cases)(
      name,
      typeof timeout === "number" ? { timeout } : timeout ?? {},
      (args, ctx) => run(ctx, [args], self)
    )

  return Object.assign(f, { skip, skipIf, runIf, only, each })
}

/** @internal */
export const effect = makeTester<TestServices.TestServices>(Effect.provide(TestEnv))

/** @internal */
export const scoped = makeTester<TestServices.TestServices | Scope.Scope>(flow(Effect.scoped, Effect.provide(TestEnv)))

/** @internal */
export const live = makeTester<never>(identity)

/** @internal */
export const scopedLive = makeTester<Scope.Scope>(Effect.scoped)

/** @internal */
export const withManagedRuntime = <R, ER>(
  managedRuntime: ManagedRuntime.ManagedRuntime<R, ER>
): Vitest.Vitest.Tester<R> => makeTester<R, ER>(Effect.provide(managedRuntime))

/** @internal */
export const flakyTest = <A, E, R>(
  self: Effect.Effect<A, E, R>,
  timeout: Duration.DurationInput = Duration.seconds(30)
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
