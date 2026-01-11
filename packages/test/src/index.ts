/**
 * @since 1.0.0
 *
 * Shared test utilities for Effect integration with test runners.
 * This package is not used directly - use @effect/vitest or @effect/bun-test.
 */

export {
  addEqualityTesters,
  flakyTest,
  layer,
  makeMethods,
  makeTester,
  prop,
  runPromise,
  runTest,
  TestEnv
} from "./internal/core.js"

// Re-export types
export type {
  API,
  Arbitraries,
  Methods,
  MethodsNonLive,
  Test,
  TestContext,
  Tester,
  TestFn,
  TestFunction,
  TestOptions,
  TestRunnerAdapter
} from "./internal/adapter.js"
