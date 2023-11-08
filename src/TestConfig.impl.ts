/**
 * @since 2.0.0
 */
import { Context } from "./Context.js"

import type { TestConfig } from "../../TestConfig.js"

export declare namespace TestConfig {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./TestConfig.impl.js"
}
  /**
   * The `TestConfig` service provides access to default configuration settings
   * used by tests, including the number of times to repeat tests to ensure
   * they are stable, the number of times to retry flaky tests, the sufficient
   * number of samples to check from a random variable, and the maximum number of
   * shrinkings to minimize large failures.
   *
   * @since 2.0.0
   */
  export interface TestConfig {
    /**
     * The number of times to repeat tests to ensure they are stable.
     */
    readonly repeats: number
    /**
     * The number of times to retry flaky tests.
     */
    readonly retries: number
    /**
     * The number of sufficient samples to check for a random variable.
     */
    readonly samples: number
    /**
     * The maximum number of shrinkings to minimize large failures
     */
    readonly shrinks: number
  }
}

/**
 * @since 2.0.0
 */
export const Tag: Context.Tag<TestConfig, TestConfig> = Context.Tag<TestConfig>(
  Symbol.for("effect/TestConfig")
)

/**
 * @since 2.0.0
 */
export const make = (params: {
  readonly repeats: number
  readonly retries: number
  readonly samples: number
  readonly shrinks: number
}): TestConfig => params
