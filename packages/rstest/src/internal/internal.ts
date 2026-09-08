/**
 * @since 4.0.0
 */

import * as Rs from "@rstest/core"
import * as Cause from "effect/Cause"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { constVoid, flow, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import type * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as TestClock from "effect/testing/TestClock"
import * as TestConsole from "effect/testing/TestConsole"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"
import type { Rstest } from "../index.ts"

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
const runTest = (ctx?: Rs.TestContext) => <E, A>(effect: Effect.Effect<A, E>) => {
  const result = runPromise(effect, ctx)
  // Rstest abandons a timed-out test promise. Wait for the interrupted fiber and
  // its finalizers before the next test or the suite teardown runs.
  ctx?.onTestFinished(() => result.then(constVoid, constVoid))
  return result
}

/** @internal */
export type TestContext = TestConsole.TestConsole | TestClock.TestClock

const TestEnv = Layer.mergeAll(TestConsole.layer, TestClock.layer())

/** @internal */
export const addEqualityTesters = () => {
  Rs.expect.addEqualityTesters([
    (a, b) => Equal.isEqual(a) && Equal.isEqual(b) ? Equal.equals(a, b) : undefined
  ])
}

/** @internal */
const testOptions = (timeout?: number | Rstest.TestOptions): Rstest.TestOptions =>
  typeof timeout === "number" ? { timeout } : timeout ?? {}

type TestAPI = Rs.TestAPIs["fails"]

type Modifier = "skip" | "only" | "fails"

// Rstest exposes these options as modifiers instead of `TestOptions` fields.
const testApi = (it: Rs.TestAPIs, options: Rstest.TestOptions, modifier?: Modifier): TestAPI => {
  let api: TestAPI = it
  if (options.concurrent !== undefined) {
    api = options.concurrent ? api.concurrent : api.sequential
  }
  if (modifier === "only" || options.only) {
    api = api.only
  } else if (modifier === "skip" || options.skip) {
    api = api.skip
  } else if (options.todo) {
    api = api.todo
  }
  return modifier === "fails" || options.fails ? api.fails : api
}

const hookTimeout = (timeout?: Duration.Input) =>
  timeout === undefined ? undefined : Duration.toMillis(Duration.fromInputUnsafe(timeout))

type PropertyTimeout =
  | number
  | Rstest.TestOptions & {
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
): Rstest.Tester<R> => {
  // Rstest test callbacks return `MaybePromise<void>`
  const run = <A, E, TestArgs extends Array<unknown>>(
    ctx: Rs.TestContext & object,
    args: TestArgs,
    self: Rstest.TestFunction<A, E, R, TestArgs>
  ) => pipe(Effect.suspend(() => self(...args)), mapEffect, Effect.asVoid, runTest(ctx))

  const test = (modifier?: Modifier): Rstest.Test<R> => (name, self, timeout) => {
    const options = testOptions(timeout)
    return testApi(it, options, modifier)(name, options, (ctx) => run(ctx, [ctx], self))
  }

  const each: Rstest.Tester<R>["each"] = (cases) => (name, self, timeout) => {
    const options = testOptions(timeout)
    return testApi(it, options).for(cases)(name, options, (args, ctx) => run(ctx, [args], self))
  }

  const prop: Rstest.Tester<R>["prop"] = (name, arbitraries, self, timeout) => {
    const arbitrary = makeArbitrary(arbitraries)
    const options = testOptions(timeout)
    return testApi(it, options)(
      name,
      options,
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

  return Object.assign(test(), {
    skip: test("skip"),
    skipIf: (condition: unknown) => test(condition ? "skip" : undefined),
    runIf: (condition: unknown) => test(condition ? undefined : "skip"),
    only: test("only"),
    fails: test("fails"),
    each,
    prop
  })
}

/** @internal */
export const prop: Rstest.Methods["prop"] = (name, arbitraries, self, timeout) => {
  const arbitrary = makeArbitrary(arbitraries)
  const options = testOptions(timeout)
  return testApi(Rs.it, options)(
    name,
    options,
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
    readonly concurrent?: boolean
    readonly memoMap?: Layer.MemoMap
    readonly timeout?: Duration.Input
    readonly excludeTestServices?: boolean
  }
): {
  (f: (it: Rstest.MethodsNonLive<R>) => void): void
  (
    name: string,
    f: (it: Rstest.MethodsNonLive<R>) => void
  ): void
} =>
(
  ...args: [
    name: string,
    f: (
      it: Rstest.MethodsNonLive<R>
    ) => void
  ] | [
    f: (it: Rstest.MethodsNonLive<R>) => void
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

  const makeIt = (it: Rs.TestAPIs): Rstest.MethodsNonLive<R> =>
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
        readonly concurrent?: boolean
        readonly timeout?: Duration.Input
      }) {
        return layer(Layer.provideMerge(nestedLayer, withTestEnv), {
          ...options,
          memoMap: Layer.forkMemoMapUnsafe(memoMap),
          excludeTestServices
        })
      }
    })

  const suite = (f: (it: Rstest.MethodsNonLive<R>) => void) => {
    let setup: Fiber.Fiber<unknown, unknown> | undefined
    Rs.beforeAll(
      () =>
        runPromise(Effect.withFiber((fiber) => {
          setup = fiber
          return Effect.asVoid(contextEffect)
        })),
      hookTimeout(options?.timeout)
    )
    // Rstest gives timed-out setup no abort signal. Request interruption without
    // delaying scope closure on uninterruptible setup. Verified with child-runner probes.
    Rs.afterAll(
      () =>
        runPromise(Effect.andThen(
          setup === undefined ? Effect.void : Effect.forkDetach(Fiber.interrupt(setup), { startImmediately: true }),
          Scope.close(scope, Exit.void)
        )),
      hookTimeout(options?.timeout)
    )
    f(makeIt(Rs.it))
  }

  if (args.length === 1) {
    // Rstest cannot enumerate the tests of the enclosing suite, so an empty suite
    // name (omitted from test paths) scopes the layer lifecycle instead.
    return Rs.describe("", () => suite(args[0]))
  }

  const describe = options?.concurrent === undefined
    ? Rs.describe
    : options.concurrent
    ? Rs.describe.concurrent
    : Rs.describe.sequential
  return describe(args[0], () => suite(args[1]))
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
export const makeMethods = (it: Rs.TestAPIs): Rstest.Methods =>
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
export const describeWrapped = (name: string, f: (it: Rstest.Methods) => void): void =>
  Rs.describe(name, () => f(makeMethods(Rs.it)))
