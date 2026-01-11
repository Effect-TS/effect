/**
 * @since 1.0.0
 */
import type { TestContext, TestOptions, TestRunnerAdapter } from "@effect/test"
import * as V from "vitest"

/** Convert Vitest's context to our TestContext */
const toTestContext = (ctx: V.TestContext): TestContext => ({
  signal: ctx.signal,
  onTestFinished: (fn) => ctx.onTestFinished(fn)
})

const toVitestOptions = (options?: TestOptions): V.TestOptions | undefined => {
  if (!options) return undefined
  const result: V.TestOptions = {}
  if (options.timeout !== undefined) result.timeout = options.timeout
  if (options.retry !== undefined) result.retry = options.retry
  if (options.repeats !== undefined) result.repeats = options.repeats
  if (options.concurrent !== undefined) result.concurrent = options.concurrent
  if (options.sequential !== undefined) result.sequential = options.sequential
  if (options.fails !== undefined) result.fails = options.fails
  return result
}

/** Vitest implementation of TestRunnerAdapter */
export const vitestAdapter: TestRunnerAdapter = {
  test: Object.assign(
    (name: string, fn: (ctx: TestContext) => Promise<void>, options?: TestOptions) => {
      V.it(name, toVitestOptions(options) ?? {}, (ctx) => fn(toTestContext(ctx)))
    },
    {
      skip: (name: string, fn: (ctx: TestContext) => Promise<void>, options?: TestOptions) =>
        V.it.skip(name, toVitestOptions(options) ?? {}, (ctx) => fn(toTestContext(ctx))),
      only: (name: string, fn: (ctx: TestContext) => Promise<void>, options?: TestOptions) =>
        V.it.only(name, toVitestOptions(options) ?? {}, (ctx) => fn(toTestContext(ctx))),
      skipIf: (condition: unknown) => (name: string, fn: (ctx: TestContext) => Promise<void>, options?: TestOptions) =>
        V.it.skipIf(condition)(name, toVitestOptions(options) ?? {}, (ctx) => fn(toTestContext(ctx))),
      runIf: (condition: unknown) => (name: string, fn: (ctx: TestContext) => Promise<void>, options?: TestOptions) =>
        V.it.runIf(condition)(name, toVitestOptions(options) ?? {}, (ctx) => fn(toTestContext(ctx))),
      fails: (name: string, fn: (ctx: TestContext) => Promise<void>, options?: TestOptions) =>
        V.it.fails(name, toVitestOptions(options) ?? {}, (ctx) => fn(toTestContext(ctx))),
      each:
        <T>(cases: ReadonlyArray<T>) =>
        (name: string, fn: (args: T, ctx: TestContext) => Promise<void>, options?: TestOptions) =>
          V.it.for(cases)(name, toVitestOptions(options) ?? {}, (args, ctx) => fn(args, toTestContext(ctx)))
    }
  ),

  describe: V.describe,
  beforeAll: V.beforeAll,
  afterAll: V.afterAll,
  beforeEach: V.beforeEach,
  afterEach: V.afterEach,

  addEqualityTesters: (testers) => V.expect.addEqualityTesters(testers as Array<any>)
}
