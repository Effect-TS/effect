/**
 * @since 4.0.0
 */

import { afterAll, beforeAll, describe, test } from "bun:test"
import * as Cause from "effect/Cause"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { flow, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import { isObject } from "effect/Predicate"
import * as Schedule from "effect/Schedule"
import type * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as TestClock from "effect/testing/TestClock"
import * as TestConsole from "effect/testing/TestConsole"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"
import type * as BunTest from "../index.ts"

// ----------------------------------------------------------------------------
// `bun:test` shape helpers
// ----------------------------------------------------------------------------

type BunTestFn = (ctx?: never) => void | Promise<void>

interface BunRegistrar {
  (name: string, fn: BunTestFn, options?: number | { timeout?: number; retry?: number }): void
}

interface BunTestApi extends BunRegistrar {
  skip: BunRegistrar
  only: BunRegistrar
  todo: BunRegistrar
  failing: BunRegistrar
  if: (condition: unknown) => BunRegistrar
  skipIf: (condition: unknown) => BunRegistrar
  todoIf: (condition: unknown) => BunRegistrar
  each: <T>(cases: ReadonlyArray<T>) => (
    name: string,
    fn: (value: T) => void | Promise<void>,
    options?: number | { timeout?: number; retry?: number }
  ) => void
}

const bunTest = test as unknown as BunTestApi

/**
 * `bun:test`'s `%s`-style title interpolation, reimplemented for the chained
 * registrars (`skip.each`) that Bun does not expose natively.
 */
const formatEachName = (name: string, value: unknown, index: number): string => {
  const values = Array.isArray(value) ? value : [value]
  let i = 0
  const formatted = name.replace(/%[sidfo#%]/g, (token) => {
    if (token === "%%") return "%"
    if (token === "%#") return String(index)
    const current = i < values.length ? values[i++] : undefined
    return typeof current === "object" && current !== null ? JSON.stringify(current) : String(current)
  })
  return formatted
}

// ----------------------------------------------------------------------------
// TestContext
// ----------------------------------------------------------------------------

interface ContextState {
  readonly controller: AbortController
  readonly finished: Array<() => void | Promise<void>>
  readonly failed: Array<() => void | Promise<void>>
}

const contextState = new WeakMap<BunTest.TestContext, ContextState>()

/** @internal */
const makeContext = (): BunTest.TestContext => {
  const state: ContextState = {
    controller: new AbortController(),
    finished: [],
    failed: []
  }
  const ctx: BunTest.TestContext = {
    signal: state.controller.signal,
    onTestFinished(fn) {
      state.finished.push(fn)
    },
    onTestFailed(fn) {
      state.failed.push(fn)
    }
  }
  contextState.set(ctx, state)
  return ctx
}

const flush = async (ctx: BunTest.TestContext, failed: boolean): Promise<void> => {
  const state = contextState.get(ctx)
  if (state === undefined) return
  if (failed) {
    for (const callback of state.failed) {
      try {
        await callback()
      } catch {
        // a failing failure hook must not mask the test's own failure
      }
    }
  }
  for (const callback of state.finished) {
    try {
      await callback()
    } catch {
      // a failing finished hook must not mask the test's own outcome
    }
  }
}

// ----------------------------------------------------------------------------
// Default API
// ----------------------------------------------------------------------------

const timeoutMillis = (opts?: number | BunTest.TestOptions): number | undefined =>
  typeof opts === "number" ? opts : opts?.timeout

const toBunOptions = (opts?: number | BunTest.TestOptions) => {
  if (opts === undefined) return undefined
  if (typeof opts === "number") return { timeout: opts }
  const out: { timeout?: number; retry?: number; repeats?: number } = {}
  if (opts.timeout !== undefined) out.timeout = opts.timeout
  if (opts.retry !== undefined) out.retry = opts.retry
  if (opts.repeats !== undefined) out.repeats = opts.repeats
  return out
}

type AnyTestFn = (ctx: BunTest.TestContext) => unknown | Promise<unknown>

const splitArgs = (
  second: BunTest.TestOptions | AnyTestFn,
  third?: AnyTestFn | number | BunTest.TestOptions
): [opts: number | BunTest.TestOptions | undefined, fn: AnyTestFn] =>
  typeof second === "function"
    ? [third as number | BunTest.TestOptions | undefined, second]
    : [second, third as AnyTestFn]

const withContext = (fn: AnyTestFn): BunTestFn => () => {
  const ctx = makeContext()
  return Promise.resolve(fn(ctx)).then(
    async (value) => {
      await flush(ctx, false)
      return value as void
    },
    async (error) => {
      await flush(ctx, true)
      throw error
    }
  )
}

const registerWith = (registrar: BunRegistrar) =>
(
  name: string,
  second: BunTest.TestOptions | AnyTestFn,
  third?: AnyTestFn | number | BunTest.TestOptions
): void => {
  const [opts, fn] = splitArgs(second, third)
  registrar(name, withContext(fn), toBunOptions(opts))
}

const baseCollector = ((
  name: string,
  second: BunTest.TestOptions | AnyTestFn,
  third?: AnyTestFn | number | BunTest.TestOptions
): void => {
  const [opts, fn] = splitArgs(second, third)
  const o = isObject(opts) ? opts as BunTest.TestOptions : undefined
  const registrar = o?.todo
    ? bunTest.todo
    : o?.fails
    ? bunTest.failing
    : o?.only
    ? bunTest.only
    : o?.skip
    ? bunTest.skip
    : bunTest
  registrar(name, withContext(fn), toBunOptions(opts))
}) as BunTest.API

const skipCollector = Object.assign(
  registerWith(bunTest.skip) as BunTest.API,
  {
    each: <T>(cases: ReadonlyArray<T>) =>
    (
      name: string,
      fn: (value: T, ctx: BunTest.TestContext) => unknown | Promise<unknown>,
      options?: number | BunTest.TestOptions
    ) => {
      cases.forEach((value, index) => {
        bunTest.skip(formatEachName(name, value, index), withContext((ctx) => fn(value, ctx)), toBunOptions(options))
      })
    }
  }
)

/** @internal */
export const defaultApi: BunTest.Collector = Object.assign(baseCollector, {
  skip: skipCollector,
  only: registerWith(bunTest.only) as BunTest.API,
  todo: (name: string) => bunTest.todo(name, () => {}),
  skipIf: (condition: unknown) => registerWith(bunTest.skipIf(condition)) as BunTest.API,
  runIf: (condition: unknown) => registerWith(bunTest.if(condition)) as BunTest.API,
  fails: registerWith(bunTest.failing) as BunTest.API,
  each: <T>(cases: ReadonlyArray<T>) =>
  (
    name: string,
    fn: (value: T, ctx: BunTest.TestContext) => unknown | Promise<unknown>,
    options?: number | BunTest.TestOptions
  ) => {
    bunTest.each(cases as Array<T>)(
      name,
      (value) => withContext((ctx) => fn(value, ctx))(),
      toBunOptions(options)
    )
  },
  describe
})

// ----------------------------------------------------------------------------
// Effect runner
// ----------------------------------------------------------------------------

const runPromise: <E, A>(
  _: Effect.Effect<A, E, never>,
  ctx?: BunTest.TestContext | undefined
) => Promise<A> = Effect.fnUntraced(
  function*<E, A>(effect: Effect.Effect<A, E>, _ctx?: BunTest.TestContext) {
    const exit = yield* Effect.exit(effect)
    if (Exit.isFailure(exit)) {
      const errors = Cause.prettyErrors(exit.cause)
      for (let i = 0; i < errors.length; i++) {
        yield* Effect.logError(errors[i])
      }
    }
    return yield* exit
  },
  (effect, _, ctx) =>
    Effect.runPromise(effect, { signal: ctx?.signal }).then(
      async (value) => {
        if (ctx !== undefined) await flush(ctx, false)
        return value
      },
      async (error) => {
        if (ctx !== undefined) await flush(ctx, true)
        throw error
      }
    )
)

/** @internal */
const runTest = (ctx?: BunTest.TestContext) => <E, A>(effect: Effect.Effect<A, E>) => runPromise(effect, ctx)

/** @internal */
export type TestContext = TestConsole.TestConsole | TestClock.TestClock

const TestEnv = Layer.mergeAll(TestConsole.layer, TestClock.layer())

/** @internal */
export const addEqualityTesters = () => {
  // No-op: `bun:test`'s `expect` does not currently expose
  // `addEqualityTesters`. Use `Equal.equals` directly (or the helpers in
  // `@effect/bun-test/utils`) to compare values that implement the
  // `Equal` trait.
}

// ----------------------------------------------------------------------------
// Property testing (effect/unstable/arbitrary)
// ----------------------------------------------------------------------------

type PropertyTimeout =
  | number
  | BunTest.TestOptions & {
    readonly arbitrary?: Arbitrary.CheckOptions | undefined
  }

type ArbitraryInput = Schema.Schema<any> | Arbitrary.Arbitrary<unknown>

type Arbitraries = Array<ArbitraryInput> | { [K in string]: ArbitraryInput }

const checkOptions = (timeout: PropertyTimeout | undefined): Arbitrary.CheckOptions | undefined =>
  typeof timeout === "number" ? undefined : timeout?.arbitrary

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
  ctx: BunTest.TestContext,
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

// ----------------------------------------------------------------------------
// Testers
// ----------------------------------------------------------------------------

/**
 * Bun's timeout fails the test but cannot interrupt the Effect fiber behind
 * it, so finalizers would never run. The wrapper owns the timeout instead:
 * it aborts the context's signal (interrupting the fiber and running its
 * finalizers), while Bun keeps a slightly larger timeout as a backstop.
 */
const makeTestContext = (timeout?: number | BunTest.TestOptions): BunTest.TestContext => {
  const ctx = makeContext()
  const millis = timeoutMillis(timeout)
  if (millis !== undefined) {
    const state = contextState.get(ctx)!
    const timer = setTimeout(() => {
      state.controller.abort(new Error(`Test timed out after ${millis}ms`))
    }, millis)
    ctx.onTestFinished(() => clearTimeout(timer))
  }
  return ctx
}

const withBackstopTimeout = (
  timeout: number | BunTest.TestOptions | undefined
): number | BunTest.TestOptions | undefined => {
  const millis = timeoutMillis(timeout)
  if (millis === undefined) return timeout
  const backstop = millis + 1_000
  return typeof timeout === "number" ? { timeout: backstop } : { ...timeout, timeout: backstop }
}

/**
 * Extends a test collector without mutating it: `makeMethods` and `layer`
 * would otherwise clobber the shared `defaultApi` (and each other) when
 * attaching their own `effect`/`live` testers.
 */
const extendApi = <M extends object>(it: BunTest.Collector, overrides: M): BunTest.Collector & M => {
  const f = ((...args: ReadonlyArray<never>) => (it as (...args: ReadonlyArray<never>) => void)(...args)) as any
  return Object.assign(f, it, overrides)
}

/** @internal */
const makeTester = <R>(
  mapEffect: <A, E>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, never>,
  it: BunTest.Collector = defaultApi
): BunTest.BunTest.Tester<R> => {
  const run = <A, E, TestArgs extends Array<unknown>>(
    ctx: BunTest.TestContext,
    args: TestArgs,
    self: BunTest.BunTest.TestFunction<A, E, R, TestArgs>
  ) => pipe(Effect.suspend(() => self(...args)), mapEffect, runTest(ctx))

  const testBody = <A, E>(
    self: BunTest.BunTest.TestFunction<A, E, R, [BunTest.TestContext]>,
    timeout?: number | BunTest.TestOptions
  ) =>
  () => {
    const ctx = makeTestContext(timeout)
    return run(ctx, [ctx], self)
  }

  const f: BunTest.BunTest.Test<R> = (name, self, timeout) =>
    it(name, testBody(self, timeout), withBackstopTimeout(timeout))

  const skip: BunTest.BunTest.Tester<R>["skip"] = (name, self, timeout) =>
    it.skip(name, testBody(self, timeout), withBackstopTimeout(timeout))

  const skipIf: BunTest.BunTest.Tester<R>["skipIf"] = (condition) => (name, self, timeout) =>
    it.skipIf(condition)(name, testBody(self, timeout), withBackstopTimeout(timeout))

  const runIf: BunTest.BunTest.Tester<R>["runIf"] = (condition) => (name, self, timeout) =>
    it.runIf(condition)(name, testBody(self, timeout), withBackstopTimeout(timeout))

  const only: BunTest.BunTest.Tester<R>["only"] = (name, self, timeout) =>
    it.only(name, testBody(self, timeout), withBackstopTimeout(timeout))

  const each: BunTest.BunTest.Tester<R>["each"] = (cases) => (name, self, timeout) =>
    it.each(cases)(
      name,
      (value) => {
        const ctx = makeTestContext(timeout)
        return run(ctx, [value] as any, self as any)
      },
      withBackstopTimeout(timeout)
    )

  const fails: BunTest.BunTest.Tester<R>["fails"] = (name, self, timeout) =>
    it.fails(name, testBody(self, timeout), withBackstopTimeout(timeout))

  const prop: BunTest.BunTest.Tester<R>["prop"] = (name, arbitraries, self, timeout) => {
    const arbitrary = makeArbitrary(arbitraries)
    return it(
      name,
      () => {
        const ctx = makeTestContext(timeout)
        return runCheck(
          ctx,
          arbitrary,
          (values) =>
            Effect.mapEager(
              mapEffect(Effect.suspend(() => self(values as any, ctx))),
              (value) => (value as unknown) !== false
            ),
          checkOptions(timeout)
        )
      },
      withBackstopTimeout(timeout)
    )
  }

  return Object.assign(f, { skip, skipIf, runIf, only, each, fails, prop })
}

/** @internal */
export const prop: BunTest.BunTest.Methods["prop"] = (name, arbitraries, self, timeout) => {
  const arbitrary = makeArbitrary(arbitraries)
  return defaultApi(
    name,
    (ctx) =>
      runCheck(
        ctx,
        arbitrary,
        (values) => (self(values as any, ctx) as unknown) !== false,
        checkOptions(timeout)
      ),
    timeout
  )
}

// ----------------------------------------------------------------------------
// layer
// ----------------------------------------------------------------------------

/** @internal */
export const layer = <R, E>(
  layer_: Layer.Layer<R, E>,
  options?: {
    readonly memoMap?: Layer.MemoMap
    readonly timeout?: Duration.Input
    readonly excludeTestServices?: boolean
  }
): {
  (f: (it: BunTest.BunTest.MethodsNonLive<R>) => void): void
  (
    name: string,
    f: (it: BunTest.BunTest.MethodsNonLive<R>) => void
  ): void
} =>
(
  ...args:
    | [name: string, f: (it: BunTest.BunTest.MethodsNonLive<R>) => void]
    | [f: (it: BunTest.BunTest.MethodsNonLive<R>) => void]
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
  const closeScope = () => {
    if (closed) {
      return Promise.resolve()
    }
    closed = true
    return runPromise(Scope.close(scope, Exit.void)) as Promise<void>
  }

  const makeIt = (it: BunTest.Collector): BunTest.BunTest.MethodsNonLive<R> =>
    extendApi(it, {
      effect: makeTester<R | Scope.Scope>(
        (effect) =>
          Effect.flatMap(contextEffect, (context) =>
            effect.pipe(
              Effect.scoped,
              Effect.provide(context)
            )),
        it
      ),
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
    }) as BunTest.BunTest.MethodsNonLive<R>

  const timeoutMs = options?.timeout !== undefined
    ? Duration.toMillis(Duration.fromInputUnsafe(options.timeout))
    : undefined

  const registerHooks = () => {
    beforeAll(
      () => runPromise(Effect.asVoid(contextEffect)) as Promise<void>,
      timeoutMs
    )
    afterAll(closeScope, timeoutMs)
  }

  if (args.length === 1) {
    registerHooks()
    return args[0](makeIt(defaultApi))
  }

  return describe(args[0], () => {
    registerHooks()
    return args[1](makeIt(defaultApi))
  })
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
export const makeMethods = (it: BunTest.Collector): BunTest.BunTest.Methods =>
  extendApi(it, {
    effect: makeTester<Scope.Scope>(flow(Effect.scoped, Effect.provide(TestEnv)), it),
    live: makeTester<Scope.Scope>(Effect.scoped, it),
    flakyTest,
    layer,
    prop
  }) as BunTest.BunTest.Methods

/** @internal */
export const {
  /** @internal */
  effect,
  /** @internal */
  live
} = makeMethods(defaultApi)

/** @internal */
export const describeWrapped = (name: string, f: (it: BunTest.BunTest.Methods) => void): void => {
  describe(name, () => {
    f(makeMethods(defaultApi))
  })
}
