/**
 * @since 1.0.0
 */
import type { Tester, TesterContext } from "@vitest/expect"
import * as Cause from "effect/Cause"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import { flow, identity, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as TestEnvironment from "effect/TestContext"
import type * as TestServices from "effect/TestServices"
import * as Utils from "effect/Utils"
import * as V from "vitest"
import type * as Vitest from "./index.js"

/** @internal */
const runTest = <E, A>(effect: Effect.Effect<A, E>) =>
  Effect.gen(function*() {
    const exit: Exit.Exit<A, E> = yield* Effect.exit(effect)
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
const makeTester = <R>(
  mapEffect: <A, E>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, never>
): Vitest.Vitest.Tester<R> => {
  const run =
    <A, E, TestArgs extends Array<any>>(self: Vitest.Vitest.TestFunction<A, E, R, TestArgs>) => (...args: TestArgs) =>
      pipe(Effect.suspend(() => self(...args)), mapEffect, runTest)

  const f: Vitest.Vitest.Test<R> = (name, self, timeout) => V.it(name, run(self), timeout)

  const skip: Vitest.Vitest.Tester<R>["only"] = (name, self, timeout) => V.it.skip(name, run(self), timeout)
  const skipIf: Vitest.Vitest.Tester<R>["skipIf"] = (condition) => (name, self, timeout) =>
    V.it.skipIf(condition)(name, run(self), timeout)
  const only: Vitest.Vitest.Tester<R>["only"] = (name, self, timeout) => V.it.only(name, run(self), timeout)
  const each: Vitest.Vitest.Tester<R>["each"] = (cases) => (name, self, timeout) =>
    V.it.each(cases)(name, run(self), timeout)

  return Object.assign(f, { skip, skipIf, only, each })
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
