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
import * as fc from "effect/FastCheck"
import * as Fiber from "effect/Fiber"
import { flow, identity, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import { isObject } from "effect/Predicate"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as TestEnvironment from "effect/TestContext"
import type * as TestServices from "effect/TestServices"
import * as Utils from "effect/Utils"
import type {
  API,
  Methods,
  MethodsNonLive,
  TestContext,
  Tester as TesterInterface,
  TestFunction,
  TestOptions,
  TestRunnerAdapter
} from "./adapter.js"

/** @internal */
export const runPromise = (ctx?: TestContext) => <E, A>(effect: Effect.Effect<A, E>) =>
  Effect.gen(function*() {
    const exitFiber = yield* Effect.fork(Effect.exit(effect))

    ctx?.onTestFinished?.(() =>
      Fiber.interrupt(exitFiber).pipe(
        Effect.asVoid,
        Effect.runPromise
      )
    )

    const exit = yield* Fiber.join(exitFiber)
    if (Exit.isSuccess(exit)) {
      return () => exit.value
    } else {
      if (Cause.isInterruptedOnly(exit.cause)) {
        return () => {
          throw new Error("All fibers interrupted without errors.")
        }
      }
      const errors = Cause.prettyErrors(exit.cause)
      for (let i = 1; i < errors.length; i++) {
        yield* Effect.logError(errors[i])
      }
      return () => {
        throw errors[0]
      }
    }
  }).pipe((effect) => Effect.runPromise(effect, ctx?.signal ? { signal: ctx.signal } : undefined)).then((f) => f())

/** @internal */
export const runTest = (ctx?: TestContext) => <E, A>(effect: Effect.Effect<A, E>) => runPromise(ctx)(effect)

/** @internal */
export const TestEnv = TestEnvironment.TestContext.pipe(
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
export const addEqualityTesters = <TRunnerContext>(adapter: TestRunnerAdapter<TRunnerContext>) => {
  adapter.addEqualityTesters?.([customTester])
}

/** @internal */
const testOptions = (timeout?: number | TestOptions): TestOptions =>
  typeof timeout === "number" ? { timeout } : timeout ?? {}

/** @internal */
export const makeTester = <R, TContext, TRunnerContext>(
  mapEffect: <A, E>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, never>,
  adapter: TestRunnerAdapter<TRunnerContext>,
  _api: API<TContext>
): TesterInterface<R, TContext> => {
  const run = <A, E, TestArgs extends Array<unknown>>(
    internalCtx: TestContext,
    args: TestArgs,
    self: TestFunction<A, E, R, TestArgs>
  ): Promise<void> => pipe(Effect.suspend(() => self(...args)), mapEffect, runTest(internalCtx)).then(() => {})

  const f: TesterInterface<R, TContext>["skip"] = (name, self, timeout) => {
    const options = testOptions(timeout)
    adapter.test(name, (internalCtx, runnerCtx) => run(internalCtx, [runnerCtx as unknown as TContext], self), options)
  }

  const skip: TesterInterface<R, TContext>["skip"] = (name, self, timeout) => {
    const options = testOptions(timeout)
    adapter.test.skip(
      name,
      (internalCtx, runnerCtx) => run(internalCtx, [runnerCtx as unknown as TContext], self),
      options
    )
  }

  const skipIf: TesterInterface<R, TContext>["skipIf"] = (condition) => (name, self, timeout) => {
    const options = testOptions(timeout)
    adapter.test.skipIf(condition)(
      name,
      (internalCtx, runnerCtx) => run(internalCtx, [runnerCtx as unknown as TContext], self),
      options
    )
  }

  const runIf: TesterInterface<R, TContext>["runIf"] = (condition) => (name, self, timeout) => {
    const options = testOptions(timeout)
    adapter.test.runIf(condition)(
      name,
      (internalCtx, runnerCtx) => run(internalCtx, [runnerCtx as unknown as TContext], self),
      options
    )
  }

  const only: TesterInterface<R, TContext>["only"] = (name, self, timeout) => {
    const options = testOptions(timeout)
    adapter.test.only(
      name,
      (internalCtx, runnerCtx) => run(internalCtx, [runnerCtx as unknown as TContext], self),
      options
    )
  }

  const each: TesterInterface<R, TContext>["each"] = (cases) => (name, self, timeout) => {
    const options = testOptions(timeout)
    adapter.test.each(cases)(
      name,
      (args, internalCtx) => run(internalCtx, [args], self) as Promise<void>,
      options
    )
  }

  const fails: TesterInterface<R, TContext>["fails"] = (name, self, timeout) => {
    const options = testOptions(timeout)
    adapter.test.fails(
      name,
      (internalCtx, runnerCtx) => run(internalCtx, [runnerCtx as unknown as TContext], self),
      options
    )
  }

  const prop: TesterInterface<R, TContext>["prop"] = (name, arbitraries, self, timeout) => {
    const options = testOptions(timeout)
    if (Array.isArray(arbitraries)) {
      const arbs = arbitraries.map((arbitrary) => Schema.isSchema(arbitrary) ? Arbitrary.make(arbitrary) : arbitrary)
      return adapter.test(
        name,
        (internalCtx, runnerCtx) =>
          // @ts-ignore
          fc.assert(
            // @ts-ignore
            fc.asyncProperty(...arbs, (...as) => run(internalCtx, [as as any, runnerCtx as unknown as TContext], self)),
            isObject(timeout) ? timeout?.fastCheck : {}
          ),
        options
      )
    }

    const arbs = fc.record(
      Object.keys(arbitraries).reduce(function(result, key) {
        result[key] = Schema.isSchema(arbitraries[key]) ? Arbitrary.make(arbitraries[key]) : arbitraries[key]
        return result
      }, {} as Record<string, fc.Arbitrary<any>>)
    )

    return adapter.test(
      name,
      (internalCtx, runnerCtx) =>
        // @ts-ignore
        fc.assert(
          fc.asyncProperty(arbs, (...as) =>
            // @ts-ignore
            run(internalCtx, [as[0] as any, runnerCtx as unknown as TContext], self)),
          isObject(timeout) ? timeout?.fastCheck : {}
        ),
      options
    )
  }

  return Object.assign(f, { skip, skipIf, runIf, only, each, fails, prop })
}

/** @internal */
export const prop = <TContext, TRunnerContext>(
  adapter: TestRunnerAdapter<TRunnerContext>
): MethodsNonLive<never, TContext>["prop"] =>
(name, arbitraries, self, timeout) => {
  const options = testOptions(timeout)
  if (Array.isArray(arbitraries)) {
    const arbs = arbitraries.map((arbitrary) =>
      Schema.isSchema(arbitrary) ? Arbitrary.make(arbitrary) : arbitrary
    ) as Array<fc.Arbitrary<unknown>>
    return adapter.test(
      name,
      async (_internalCtx, runnerCtx) => {
        fc.assert(
          fc.property(
            ...(arbs as [fc.Arbitrary<unknown>, ...Array<fc.Arbitrary<unknown>>]),
            (...as: Array<unknown>) => self(as as any, runnerCtx as any)
          ),
          isObject(timeout) ? timeout?.fastCheck : {}
        )
      },
      options
    )
  }

  const arbs = fc.record(
    Object.keys(arbitraries).reduce(function(result, key) {
      result[key] = Schema.isSchema(arbitraries[key]) ? Arbitrary.make(arbitraries[key]) : arbitraries[key]
      return result
    }, {} as Record<string, fc.Arbitrary<any>>)
  )

  return adapter.test(
    name,
    async (_internalCtx, runnerCtx) => {
      fc.assert(
        fc.property(arbs, (as) => self(as as any, runnerCtx as any)),
        isObject(timeout) ? timeout?.fastCheck : {}
      )
    },
    options
  )
}

/** @internal */
export const layer = <TContext, TRunnerContext>(
  adapter: TestRunnerAdapter<TRunnerContext>,
  api: API<TContext>
) =>
<R, E, const ExcludeTestServices extends boolean = false>(
  layer_: Layer.Layer<R, E>,
  options?: {
    readonly memoMap?: Layer.MemoMap
    readonly timeout?: Duration.DurationInput
    readonly excludeTestServices?: ExcludeTestServices
  }
): {
  (f: (it: MethodsNonLive<R, TContext, ExcludeTestServices>) => void): void
  (
    name: string,
    f: (it: MethodsNonLive<R, TContext, ExcludeTestServices>) => void
  ): void
} =>
(
  ...args: [
    name: string,
    f: (
      it: MethodsNonLive<R, TContext, ExcludeTestServices>
    ) => void
  ] | [
    f: (it: MethodsNonLive<R, TContext, ExcludeTestServices>) => void
  ]
) => {
  const excludeTestServices = options?.excludeTestServices ?? false
  const withTestEnv = excludeTestServices
    ? layer_ as Layer.Layer<R | TestServices.TestServices, E>
    : Layer.provideMerge(layer_, TestEnv)
  const memoMap = options?.memoMap ?? Effect.runSync(Layer.makeMemoMap)
  const scope = Effect.runSync(Scope.make())
  const runtimeEffect = Layer.toRuntimeWithMemoMap(withTestEnv, memoMap).pipe(
    Scope.extend(scope),
    Effect.orDie,
    Effect.cached,
    Effect.runSync
  )

  const makeIt = (itApi: API<TContext>): MethodsNonLive<R, TContext, ExcludeTestServices> =>
    Object.assign(itApi, {
      effect: makeTester<TestServices.TestServices | R, TContext, TRunnerContext>(
        (effect) => Effect.flatMap(runtimeEffect, (runtime) => effect.pipe(Effect.provide(runtime))),
        adapter,
        itApi
      ),

      prop: prop<TContext, TRunnerContext>(adapter),

      scoped: makeTester<TestServices.TestServices | Scope.Scope | R, TContext, TRunnerContext>(
        (effect) =>
          Effect.flatMap(runtimeEffect, (runtime) =>
            effect.pipe(
              Effect.scoped,
              Effect.provide(runtime)
            )),
        adapter,
        itApi
      ),
      flakyTest,
      layer<R2, E2>(nestedLayer: Layer.Layer<R2, E2, R>, nestedOptions?: {
        readonly timeout?: Duration.DurationInput
      }) {
        return layer<TContext, TRunnerContext>(adapter, itApi)(
          Layer.provideMerge(nestedLayer, withTestEnv),
          { ...nestedOptions, memoMap, excludeTestServices }
        )
      }
    }) as MethodsNonLive<R, TContext, ExcludeTestServices>

  if (args.length === 1) {
    adapter.beforeAll(
      () => runPromise()(Effect.asVoid(runtimeEffect)),
      options?.timeout ? Duration.toMillis(options.timeout) : undefined
    )
    adapter.afterAll(
      () => runPromise()(Scope.close(scope, Exit.void)),
      options?.timeout ? Duration.toMillis(options.timeout) : undefined
    )
    return args[0](makeIt(api))
  }

  return adapter.describe(args[0], () => {
    adapter.beforeAll(
      () => runPromise()(Effect.asVoid(runtimeEffect)),
      options?.timeout ? Duration.toMillis(options.timeout) : undefined
    )
    adapter.afterAll(
      () => runPromise()(Scope.close(scope, Exit.void)),
      options?.timeout ? Duration.toMillis(options.timeout) : undefined
    )
    return args[1](makeIt(api))
  })
}

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

/** @internal */
export const makeMethods = <TContext, TRunnerContext>(
  adapter: TestRunnerAdapter<TRunnerContext>,
  api: API<TContext>
): Methods<never, TContext> =>
  ({
    effect: makeTester<TestServices.TestServices, TContext, TRunnerContext>(Effect.provide(TestEnv), adapter, api),
    scoped: makeTester<TestServices.TestServices | Scope.Scope, TContext, TRunnerContext>(
      flow(Effect.scoped, Effect.provide(TestEnv)),
      adapter,
      api
    ),
    live: makeTester<never, TContext, TRunnerContext>(identity, adapter, api),
    scopedLive: makeTester<Scope.Scope, TContext, TRunnerContext>(Effect.scoped, adapter, api),
    flakyTest,
    layer: layer(adapter, api),
    prop: prop<TContext, TRunnerContext>(adapter)
  }) as Methods<never, TContext>
