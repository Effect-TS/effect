/**
 * @since 1.0.0
 */
import type { Tester, TesterContext } from "@vitest/expect"
import * as Arbitrary from "effect/Arbitrary"
import * as Cause from "effect/Cause"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { flow, identity, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import { isObject } from "effect/Predicate"
import * as Schedule from "effect/Schedule"
import * as Scope from "effect/Scope"
import * as TestEnvironment from "effect/TestContext"
import type * as TestServices from "effect/TestServices"
import * as Utils from "effect/Utils"
import fc from "fast-check"
import * as V from "vitest"
import type * as Vitest from "./index.js"

const runPromise = (ctx?: Vitest.TaskContext) => <E, A>(effect: Effect.Effect<A, E>) =>
  Effect.gen(function*() {
    const exitFiber = yield* Effect.fork(Effect.exit(effect))

    ctx?.onTestFinished(() =>
      Fiber.interrupt(exitFiber).pipe(
        Effect.asVoid,
        Effect.runPromise
      )
    )

    const exit = yield* Fiber.join(exitFiber)
    if (Exit.isSuccess(exit)) {
      return () => exit.value
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
const runTest = (ctx?: Vitest.TaskContext) => <E, A>(effect: Effect.Effect<A, E>) => runPromise(ctx)(effect)

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
      (args, ctx) => run(ctx, [args], self) as any
    )

  const prop: Vitest.Vitest.Tester<R>["prop"] = (name, schemaObj, self, timeout) => {
    if (Array.isArray(schemaObj)) {
      const arbs = schemaObj.map((schema) => Arbitrary.make(schema))
      return V.it(
        name,
        (ctx) =>
          // @ts-ignore
          fc.assert(
            // @ts-ignore
            fc.asyncProperty(...arbs, (...as) => run(ctx, [as as any, ctx], self)),
            isObject(timeout) ? timeout?.fastCheck : {}
          ),
        timeout
      )
    }

    const arbs = fc.record(
      Object.keys(schemaObj).reduce(function(result, key) {
        result[key] = Arbitrary.make(schemaObj[key])
        return result
      }, {} as Record<string, fc.Arbitrary<any>>)
    )

    return V.it(
      name,
      (ctx) =>
        // @ts-ignore
        fc.assert(
          fc.asyncProperty(arbs, (...as) =>
            // @ts-ignore
            run(ctx, [as[0] as any, ctx], self)),
          isObject(timeout) ? timeout?.fastCheck : {}
        ),
      timeout
    )
  }

  return Object.assign(f, { skip, skipIf, runIf, only, each, prop })
}

export const prop: Vitest.Vitest.Methods["prop"] = (name, schemaObj, self, timeout) => {
  if (Array.isArray(schemaObj)) {
    const arbs = schemaObj.map((schema) => Arbitrary.make(schema))
    return V.it(
      name,
      // @ts-ignore
      (ctx) => fc.assert(fc.property(...arbs, (...as) => self(as, ctx)), isObject(timeout) ? timeout?.fastCheck : {}),
      timeout
    )
  }

  const arbs = fc.record(
    Object.keys(schemaObj).reduce(function(result, key) {
      result[key] = Arbitrary.make(schemaObj[key])
      return result
    }, {} as Record<string, fc.Arbitrary<any>>)
  )

  return V.it(
    name,
    // @ts-ignore
    (ctx) => fc.assert(fc.property(arbs, (...as) => self(as[0], ctx)), check),
    timeout
  )
}

/** @internal */
export const layer = <R, E>(layer_: Layer.Layer<R, E>, options?: {
  readonly memoMap?: Layer.MemoMap
  readonly timeout?: Duration.DurationInput
}): {
  (f: (it: Vitest.Vitest.Methods<R>) => void): void
  (name: string, f: (it: Vitest.Vitest.Methods<R>) => void): void
} =>
(
  ...args: [name: string, f: (it: Vitest.Vitest.Methods<R>) => void] | [f: (it: Vitest.Vitest.Methods<R>) => void]
) => {
  const memoMap = options?.memoMap ?? Effect.runSync(Layer.makeMemoMap)
  const scope = Effect.runSync(Scope.make())
  const runtimeEffect = Layer.toRuntimeWithMemoMap(layer_, memoMap).pipe(
    Scope.extend(scope),
    Effect.orDie,
    Effect.cached,
    Effect.runSync
  )

  const it: Vitest.Vitest.Methods<R> = Object.assign(V.it, {
    effect: makeTester<TestServices.TestServices | R>((effect) =>
      Effect.flatMap(runtimeEffect, (runtime) =>
        effect.pipe(
          Effect.provide(runtime),
          Effect.provide(TestEnv)
        ))
    ),

    prop,

    scoped: makeTester<TestServices.TestServices | Scope.Scope | R>((effect) =>
      Effect.flatMap(runtimeEffect, (runtime) =>
        effect.pipe(
          Effect.scoped,
          Effect.provide(runtime),
          Effect.provide(TestEnv)
        ))
    ),
    live: makeTester<R>((effect) =>
      Effect.flatMap(
        runtimeEffect,
        (runtime) => Effect.provide(effect, runtime)
      )
    ),
    scopedLive: makeTester<Scope.Scope | R>((effect) =>
      Effect.flatMap(runtimeEffect, (runtime) =>
        effect.pipe(
          Effect.scoped,
          Effect.provide(runtime)
        ))
    ),
    flakyTest,
    layer<R2, E2>(nestedLayer: Layer.Layer<R2, E2, R>, options?: {
      readonly timeout?: Duration.DurationInput
    }) {
      return layer(Layer.provideMerge(nestedLayer, layer_), { ...options, memoMap })
    }
  })

  if (args.length === 1) {
    V.beforeAll(
      () => runPromise()(Effect.asVoid(runtimeEffect)),
      options?.timeout ? Duration.toMillis(options.timeout) : undefined
    )
    V.afterAll(
      () => runPromise()(Scope.close(scope, Exit.void)),
      options?.timeout ? Duration.toMillis(options.timeout) : undefined
    )
    return args[0](it)
  }

  return V.describe(args[0], () => {
    V.beforeAll(
      () => runPromise()(Effect.asVoid(runtimeEffect)),
      options?.timeout ? Duration.toMillis(options.timeout) : undefined
    )
    V.afterAll(
      () => runPromise()(Scope.close(scope, Exit.void)),
      options?.timeout ? Duration.toMillis(options.timeout) : undefined
    )
    return args[1](it)
  })
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
