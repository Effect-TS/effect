/**
 * @since 4.0.0
 */

import * as Rs from "@rstest/core"
import * as Cause from "effect/Cause"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { flow, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import type * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as TestClock from "effect/testing/TestClock"
import * as TestConsole from "effect/testing/TestConsole"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"
import type * as Rstest from "../index.ts"

const runPromise: <E, A>(
  _: Effect.Effect<A, E, never>,
  ctx?: Rs.TestContext | undefined
) => Promise<A> = Effect.fnUntraced(function*<E, A>(effect: Effect.Effect<A, E>, _ctx?: Rs.TestContext) {
  const exit = yield* Effect.exit(effect)
  if (Exit.isFailure(exit)) {
    const errors = Cause.prettyErrors(exit.cause)
    for (let i = 0; i < errors.length; i++) {
      yield* Effect.logError(errors[i])
    }
  }
  return yield* exit
}, (effect, _, ctx) => Effect.runPromise(effect, { signal: ctx?.signal }))

/** @internal */
const runTest = (ctx?: Rs.TestContext) => <E, A>(effect: Effect.Effect<A, E>) => runPromise(effect, ctx)

/** @internal */
export type TestContext = TestConsole.TestConsole | TestClock.TestClock

const TestEnv = Layer.mergeAll(TestConsole.layer, TestClock.layer())

/** @internal */
export const addEqualityTesters = () => {
  Rs.expect.addEqualityTesters([])
}

/** @internal */
const testOptions = (timeout?: number | Rstest.Vitest.TestOptions): Rs.TestOptions => {
  if (typeof timeout === "number") {
    return { timeout }
  }
  if (timeout === undefined) {
    return {}
  }
  const { fails: _fails, ...options } = timeout
  return options
}

// Rstest only reads `timeout`, `retry`, `repeats` and `meta` from the options
// object; `fails` is only honoured through the `it.fails` modifier.
const testApi = (it: Rs.TestAPIs, timeout?: number | Rstest.Vitest.TestOptions): Rs.TestAPIs["fails"] =>
  typeof timeout === "object" && timeout.fails === true ? it.fails : it

const hookTimeout = (timeout?: Duration.Input) =>
  timeout === undefined ? undefined : Duration.toMillis(Duration.fromInputUnsafe(timeout))

type PropertyTimeout =
  | number
  | Rstest.Vitest.TestOptions & {
    readonly arbitrary?: Arbitrary.CheckOptions | undefined
  }

type ArbitraryInput = Schema.Schema<any> | Arbitrary.Arbitrary<unknown>

type Arbitraries = Array<ArbitraryInput> | { [K in string]: ArbitraryInput }

const propertyTestOptions = (
  timeout: PropertyTimeout | undefined
): Exclude<PropertyTimeout, number> | undefined => typeof timeout === "number" ? undefined : timeout

const checkOptions = (timeout: PropertyTimeout | undefined): Arbitrary.CheckOptions | undefined =>
  propertyTestOptions(timeout)?.arbitrary

const compileArbitraryInput = (input: ArbitraryInput): Arbitrary.Arbitrary<any> =>
  Arbitrary.isArbitrary(input) ? input : Arbitrary.schema(input)

const makeArbitrary = (arbitraries: Arbitraries): Arbitrary.Arbitrary<any> =>
  Arbitrary.all(
    Array.isArray(arbitraries)
      ? arbitraries.map(compileArbitraryInput)
      : Object.fromEntries(Object.entries(arbitraries).map(([key, input]) => [key, compileArbitraryInput(input)]))
  )

const normalizeProperty = <A, E, R>(
  property: (value: A) => boolean | Effect.Effect<boolean, E, R>,
  value: A
): Effect.Effect<boolean, E | Cause.Cause<E>, R> =>
  Effect.catchCause(
    Effect.suspend(() => {
      const output = property(value)
      return Effect.isEffect(output) ? output : Effect.succeed(output)
    }),
    (cause): Effect.Effect<never, E | Cause.Cause<E>> =>
      Cause.hasInterrupts(cause) ? Effect.failCause(cause) : Effect.fail(cause)
  )

const runCheck = <A, E>(
  ctx: Rs.TestContext,
  arbitrary: Arbitrary.Arbitrary<A>,
  property: (value: A) => boolean | Effect.Effect<boolean, E>,
  options: Arbitrary.CheckOptions | undefined
): Promise<void> =>
  runTest(ctx)(
    Effect.flatMapEager(
      Arbitrary.checkEffect(arbitrary, (value) => normalizeProperty(property, value), options),
      (result) => {
        const failure = Arbitrary.formatCheckFailure(result)
        return failure === undefined ? Effect.void : Effect.die(new Error(failure))
      }
    )
  )

const makeItProxy = <Methods extends object>(
  it: Rs.TestAPIs,
  overrides: Methods
): Methods & Rs.TestAPIs =>
  new Proxy(it as Methods & Rs.TestAPIs, {
    apply(target, thisArg, argArray) {
      return Reflect.apply(target, thisArg, argArray)
    },
    get(target, property, receiver) {
      if (Object.hasOwn(overrides, property)) {
        return Reflect.get(overrides, property)
      }
      // do not bind: binding would strip rstest's static helpers (e.g. `it.each`)
      return Reflect.get(target, property, receiver)
    }
  })

/** @internal */
const makeTester = <R>(
  mapEffect: <A, E>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, never>,
  it: Rs.TestAPIs = Rs.it
): Rstest.Vitest.Tester<R> => {
  // Rstest test callbacks must return `MaybePromise<void>`, so the value
  // produced by the test effect is discarded (vitest ignored it as well).
  const run = <A, E, TestArgs extends Array<unknown>>(
    ctx: Rs.TestContext & object,
    args: TestArgs,
    self: Rstest.Vitest.TestFunction<A, E, R, TestArgs>
  ): Promise<any> => pipe(Effect.suspend(() => self(...args)), mapEffect, runTest(ctx))

  const f: Rstest.Vitest.Test<R> = (name, self, timeout) =>
    testApi(it, timeout)(name, testOptions(timeout), (ctx) => run(ctx, [ctx], self))

  const skip: Rstest.Vitest.Tester<R>["only"] = (name, self, timeout) =>
    it.skip(name, testOptions(timeout), (ctx) => run(ctx, [ctx], self))

  // Rstest types `skipIf` / `runIf` conditions as `boolean`, while the public
  // Effect API accepts `unknown` like `@effect/vitest`.
  const skipIf: Rstest.Vitest.Tester<R>["skipIf"] = (condition) => (name, self, timeout) =>
    it.skipIf(Boolean(condition))(name, testOptions(timeout), (ctx) => run(ctx, [ctx], self))

  const runIf: Rstest.Vitest.Tester<R>["runIf"] = (condition) => (name, self, timeout) =>
    it.runIf(Boolean(condition))(name, testOptions(timeout), (ctx) => run(ctx, [ctx], self))

  const only: Rstest.Vitest.Tester<R>["only"] = (name, self, timeout) =>
    it.only(name, testOptions(timeout), (ctx) => run(ctx, [ctx], self))

  const each: Rstest.Vitest.Tester<R>["each"] = (cases) => (name, self, timeout) =>
    it.for(cases)(
      name,
      testOptions(timeout),
      (args, ctx) => run(ctx, [args], self) as any
    )

  const fails: Rstest.Vitest.Tester<R>["fails"] = (name, self, timeout) =>
    it.fails(name, testOptions(timeout), (ctx) => run(ctx, [ctx], self))

  const prop: Rstest.Vitest.Tester<R>["prop"] = (name, arbitraries, self, timeout) => {
    const arbitrary = makeArbitrary(arbitraries)
    return testApi(it, timeout)(
      name,
      testOptions(timeout),
      (ctx) =>
        runCheck(
          ctx,
          arbitrary,
          (values) =>
            Effect.mapEager(
              mapEffect(Effect.suspend(() => self(values as any, ctx))),
              (value) => (value as unknown) !== false
            ),
          checkOptions(timeout)
        )
    )
  }

  return Object.assign(f, { skip, skipIf, runIf, only, each, fails, prop })
}

/** @internal */
export const prop: Rstest.Vitest.Methods["prop"] = (name, arbitraries, self, timeout) => {
  const arbitrary = makeArbitrary(arbitraries)
  return testApi(Rs.it, timeout)(
    name,
    testOptions(timeout),
    (ctx) =>
      runCheck(
        ctx,
        arbitrary,
        (values) => (self(values as any, ctx) as unknown) !== false,
        checkOptions(timeout)
      )
  )
}

/** @internal */
export const layer = <R, E>(
  layer_: Layer.Layer<R, E>,
  options?: {
    readonly memoMap?: Layer.MemoMap
    readonly timeout?: Duration.Input
    readonly excludeTestServices?: boolean
  }
): {
  (f: (it: Rstest.Vitest.MethodsNonLive<R>) => void): void
  (
    name: string,
    f: (it: Rstest.Vitest.MethodsNonLive<R>) => void
  ): void
} =>
(
  ...args: [
    name: string,
    f: (
      it: Rstest.Vitest.MethodsNonLive<R>
    ) => void
  ] | [
    f: (it: Rstest.Vitest.MethodsNonLive<R>) => void
  ]
) => {
  const excludeTestServices = options?.excludeTestServices ?? false
  const withTestEnv = excludeTestServices
    ? layer_ as Layer.Layer<R, E>
    : Layer.provideMerge(layer_, TestEnv)
  const memoMap = options?.memoMap ?? Effect.runSync(Layer.makeMemoMap)
  const scope = Effect.runSync(Scope.make())
  const contextEffect = Layer.buildWithMemoMap(withTestEnv, memoMap, scope).pipe(
    Effect.orDie,
    Effect.cached,
    Effect.runSync
  )
  let closed = false
  const closeScope = (ctx?: Rs.TestContext) => {
    if (closed) {
      return Promise.resolve()
    }
    closed = true
    return runPromise(Scope.close(scope, Exit.void), ctx)
  }

  const makeIt = (it: Rs.TestAPIs): Rstest.Vitest.MethodsNonLive<R> =>
    makeItProxy(it, {
      effect: makeTester<R | Scope.Scope>(
        (effect) =>
          Effect.flatMap(contextEffect, (context) =>
            effect.pipe(
              Effect.scoped,
              Effect.provide(context)
            )),
        it
      ),
      describe: Rs.describe,
      prop,
      flakyTest,
      layer<R2, E2>(nestedLayer: Layer.Layer<R2, E2, R>, options?: {
        readonly timeout?: Duration.Input
      }) {
        return layer(Layer.provideMerge(nestedLayer, withTestEnv), {
          ...options,
          memoMap: Layer.forkMemoMapUnsafe(memoMap),
          excludeTestServices
        })
      }
    })

  const register = (f: (it: Rstest.Vitest.MethodsNonLive<R>) => void) => {
    Rs.beforeAll(
      () => runPromise(Effect.asVoid(contextEffect)),
      hookTimeout(options?.timeout)
    )
    Rs.afterAll(
      () => closeScope(),
      hookTimeout(options?.timeout)
    )
    return f(makeIt(Rs.it))
  }

  if (args.length === 1) {
    // Rstest has no `getCurrentSuite()`, so the tests of an unnamed block
    // cannot be enumerated the way `@effect/vitest` does. An empty nested
    // suite is used as the lifecycle boundary instead: Rstest omits empty
    // suite names from test paths, while its `beforeAll` / `afterAll` hooks
    // build the layer before the block and release it before later tests in
    // the enclosing suite run.
    return Rs.describe("", () => register(args[0]))
  }

  return Rs.describe(args[0], () => register(args[1]))
}

/** @internal */
export const flakyTest = <A, E, R>(
  self: Effect.Effect<A, E, R | Scope.Scope>,
  timeout: Duration.Input = Duration.seconds(30)
) =>
  pipe(
    self,
    Effect.scoped,
    Effect.sandbox,
    Effect.retry(
      pipe(
        Schedule.recurs(10),
        Schedule.while((_) =>
          Effect.succeed(Duration.isLessThanOrEqualTo(
            Duration.fromInputUnsafe(_.elapsed),
            Duration.fromInputUnsafe(timeout)
          ))
        )
      )
    ),
    Effect.orDie
  )

/** @internal */
export const makeMethods = (it: Rs.TestAPIs): Rstest.Vitest.Methods =>
  makeItProxy(it, {
    effect: makeTester<Scope.Scope>(flow(Effect.scoped, Effect.provide(TestEnv)), it),
    live: makeTester<Scope.Scope>(Effect.scoped, it),
    describe: Rs.describe,
    flakyTest,
    layer,
    prop
  })

/** @internal */
export const {
  /** @internal */
  effect,
  /** @internal */
  live
} = makeMethods(Rs.it)

/** @internal */
export const describeWrapped = (name: string, f: (it: Rstest.Vitest.Methods) => void): void =>
  Rs.describe(name, () => f(makeMethods(Rs.it)))
