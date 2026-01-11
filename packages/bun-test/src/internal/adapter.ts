/**
 * @since 1.0.0
 */
import type { TestContext, TestOptions, TestRunnerAdapter } from "@effect/test"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test"

/**
 * Bun doesn't have onTestFinished or signal in test context.
 * We provide an empty context - cleanup happens via afterEach if needed.
 */
const emptyContext: TestContext = {}

const toBunOptions = (options?: TestOptions): { timeout?: number } | undefined => {
  if (!options?.timeout) return undefined
  return { timeout: options.timeout }
}

/** Bun implementation of TestRunnerAdapter */
export const bunAdapter: TestRunnerAdapter = {
  test: Object.assign(
    (name: string, fn: (ctx: TestContext) => Promise<void>, options?: TestOptions) => {
      test(name, () => fn(emptyContext), toBunOptions(options))
    },
    {
      skip: (name: string, fn: (ctx: TestContext) => Promise<void>, options?: TestOptions) =>
        test.skip(name, () => fn(emptyContext), toBunOptions(options)),
      only: (name: string, fn: (ctx: TestContext) => Promise<void>, options?: TestOptions) =>
        test.only(name, () => fn(emptyContext), toBunOptions(options)),
      skipIf: (condition: unknown) => (name: string, fn: (ctx: TestContext) => Promise<void>, options?: TestOptions) =>
        test.skipIf(condition as boolean)(name, () => fn(emptyContext), toBunOptions(options)),
      runIf: (condition: unknown) => (name: string, fn: (ctx: TestContext) => Promise<void>, options?: TestOptions) =>
        test.if(condition as boolean)(name, () => fn(emptyContext), toBunOptions(options)),
      fails: (name: string, fn: (ctx: TestContext) => Promise<void>, options?: TestOptions) =>
        test.todo(name, () => fn(emptyContext), toBunOptions(options)),
      each:
        <T>(cases: ReadonlyArray<T>) =>
        (name: string, fn: (args: T, ctx: TestContext) => Promise<void>, options?: TestOptions) =>
          test.each(cases as Array<T>)(name, (args) => fn(args, emptyContext), toBunOptions(options))
    }
  ),

  describe,
  // Bun's lifecycle hooks don't accept a timeout parameter
  beforeAll: (fn) => beforeAll(fn),
  afterAll: (fn) => afterAll(fn),
  beforeEach: (fn) => beforeEach(fn),
  afterEach: (fn) => afterEach(fn)
}

// Re-export expect for convenience
export { expect }
