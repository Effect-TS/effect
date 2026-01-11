/**
 * @since 1.0.0
 */
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import type * as FC from "effect/FastCheck"
import type * as Layer from "effect/Layer"
import type * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import type * as TestServices from "effect/TestServices"

/**
 * Context passed to test functions - runner-specific
 * @since 1.0.0
 */
export interface TestContext {
  /** AbortSignal for test timeout/cancellation (optional - not all runners support) */
  readonly signal?: AbortSignal
  /** Register cleanup to run after this specific test */
  readonly onTestFinished?: (fn: () => Promise<void>) => void
}

/**
 * @since 1.0.0
 */
export interface TestOptions {
  readonly timeout?: number
  readonly retry?: number
  readonly repeats?: number
  readonly concurrent?: boolean
  readonly sequential?: boolean
  readonly fails?: boolean
  readonly fastCheck?: FC.Parameters<any>
}

/**
 * Function signature for a test implementation
 * @since 1.0.0
 */
export interface TestFn {
  (ctx: TestContext): Promise<void>
}

/**
 * Core test registration function
 * @since 1.0.0
 */
export interface TestRegister {
  (name: string, fn: TestFn, options?: TestOptions): void
}

/**
 * Parameterized test helper
 * @since 1.0.0
 */
export interface TestEach {
  <T>(cases: ReadonlyArray<T>): (
    name: string,
    fn: (args: T, ctx: TestContext) => Promise<void>,
    options?: TestOptions
  ) => void
}

/**
 * Adapter interface that test runners must implement
 * @since 1.0.0
 */
export interface TestRunnerAdapter {
  readonly test: TestRegister & {
    readonly skip: TestRegister
    readonly only: TestRegister
    readonly skipIf: (condition: unknown) => TestRegister
    readonly runIf: (condition: unknown) => TestRegister
    readonly fails: TestRegister
    readonly each: TestEach
  }

  readonly describe: (name: string, fn: () => void) => void

  readonly beforeAll: (fn: () => Promise<void>, timeout?: number) => void
  readonly afterAll: (fn: () => Promise<void>, timeout?: number) => void
  readonly beforeEach: (fn: () => Promise<void>, timeout?: number) => void
  readonly afterEach: (fn: () => Promise<void>, timeout?: number) => void

  /** Add custom equality testers for Effect's Equal trait */
  readonly addEqualityTesters?: (testers: Array<unknown>) => void
}

/**
 * @since 1.0.0
 */
export interface TestFunction<A, E, R, TestArgs extends Array<any>> {
  (...args: TestArgs): Effect.Effect<A, E, R>
}

/**
 * @since 1.0.0
 */
export interface Test<R, TContext> {
  <A, E>(
    name: string,
    self: TestFunction<A, E, R, [TContext]>,
    timeout?: number | TestOptions
  ): void
}

/**
 * @since 1.0.0
 */
export type Arbitraries =
  | Array<Schema.Schema.Any | FC.Arbitrary<any>>
  | { [K in string]: Schema.Schema.Any | FC.Arbitrary<any> }

/**
 * @since 1.0.0
 */
export interface Tester<R, TContext> extends Test<R, TContext> {
  skip: Test<R, TContext>
  skipIf: (condition: unknown) => Test<R, TContext>
  runIf: (condition: unknown) => Test<R, TContext>
  only: Test<R, TContext>
  each: <T>(
    cases: ReadonlyArray<T>
  ) => <A, E>(name: string, self: TestFunction<A, E, R, Array<T>>, timeout?: number | TestOptions) => void
  fails: Test<R, TContext>

  /**
   * @since 1.0.0
   */
  prop: <const Arbs extends Arbitraries, A, E>(
    name: string,
    arbitraries: Arbs,
    self: TestFunction<
      A,
      E,
      R,
      [
        { [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T : Schema.Schema.Type<Arbs[K]> },
        TContext
      ]
    >,
    timeout?:
      | number
      | TestOptions
  ) => void
}

/**
 * Base API interface that adapters provide
 * @since 1.0.0
 */
export interface API<TContext> {
  /**
   * @deprecated Use options as the second argument instead
   */
  <ExtraContext extends object>(
    name: string | Function,
    fn: (ctx: ExtraContext) => void | Promise<void>,
    options: TestOptions
  ): void
  <ExtraContext extends object>(
    name: string | Function,
    fn?: (ctx: ExtraContext) => void | Promise<void>,
    options?: number | TestOptions
  ): void
  <ExtraContext extends object>(
    name: string | Function,
    options?: TestOptions,
    fn?: (ctx: ExtraContext) => void | Promise<void>
  ): void

  skip: (name: string, fn?: () => void | Promise<void>, options?: TestOptions) => void
  only: (name: string, fn?: () => void | Promise<void>, options?: TestOptions) => void
  skipIf: (condition: unknown) => (name: string, fn?: () => void | Promise<void>, options?: TestOptions) => void
  runIf: (condition: unknown) => (name: string, fn?: () => void | Promise<void>, options?: TestOptions) => void
  fails: (name: string, fn?: () => void | Promise<void>, options?: TestOptions) => void
  for: <T>(cases: ReadonlyArray<T>) => (
    name: string,
    options: TestOptions,
    fn: (args: T, ctx: TContext) => void | Promise<void>
  ) => void
}

/**
 * @since 1.0.0
 */
export interface MethodsNonLive<R, TContext, ExcludeTestServices extends boolean = false> {
  readonly effect: Tester<(ExcludeTestServices extends true ? never : TestServices.TestServices) | R, TContext>
  readonly flakyTest: <A, E, R2>(
    self: Effect.Effect<A, E, R2>,
    timeout?: Duration.DurationInput
  ) => Effect.Effect<A, never, R2>
  readonly scoped: Tester<
    (ExcludeTestServices extends true ? never : TestServices.TestServices) | Scope.Scope | R,
    TContext
  >
  readonly layer: <R2, E>(layer: Layer.Layer<R2, E, R>, options?: {
    readonly timeout?: Duration.DurationInput
  }) => {
    (f: (it: MethodsNonLive<R | R2, TContext, ExcludeTestServices>) => void): void
    (
      name: string,
      f: (it: MethodsNonLive<R | R2, TContext, ExcludeTestServices>) => void
    ): void
  }

  /**
   * @since 1.0.0
   */
  readonly prop: <const Arbs extends Arbitraries>(
    name: string,
    arbitraries: Arbs,
    self: (
      properties: { [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T : Schema.Schema.Type<Arbs[K]> },
      ctx: TContext
    ) => void,
    timeout?: number | TestOptions
  ) => void
}

/**
 * @since 1.0.0
 */
export interface Methods<R, TContext> extends MethodsNonLive<R, TContext> {
  readonly live: Tester<R, TContext>
  readonly scopedLive: Tester<Scope.Scope | R, TContext>
}
