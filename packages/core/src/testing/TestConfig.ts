import { Tag } from "@fp-ts/data/Context"

/**
 * The `TestConfig` service provides access to default configuration settings
 * used by tests, including the number of times to repeat tests to ensure
 * they are stable, the number of times to retry flaky tests, the sufficient
 * number of samples to check from a random variable, and the maximum number of
 * shrinkings to minimize large failures.
 *
 * @tsplus type effect/core/testing/TestConfig
 * @category model
 * @since 1.0.0
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

/**
 * @tsplus type effect/core/testing/TestConfig.Ops
 * @category model
 * @since 1.0.0
 */
export interface TestConfigOps {
  (params: {
    readonly repeats: number
    readonly retries: number
    readonly samples: number
    readonly shrinks: number
  }): TestConfig
  readonly $: TestConfigAspects
  readonly Tag: Tag<TestConfig>
}
export const TestConfig: TestConfigOps = Object.assign(
  (params: {
    readonly repeats: number
    readonly retries: number
    readonly samples: number
    readonly shrinks: number
  }): TestConfig => params,
  {
    $: {},
    Tag: Tag<TestConfig>()
  }
)

/**
 * @tsplus type effect/core/testing/TestConfig.Aspects
 * @category model
 * @since 1.0.0
 */
export interface TestConfigAspects {}

/**
 * Constructs a new `TestConfig` service with the specified settings.
 *
 * @tsplus static effect/core/testing/TestConfig.Ops live
 * @category constructors
 * @since 1.0.0
 */
export function live(
  params: {
    readonly repeats: number
    readonly retries: number
    readonly samples: number
    readonly shrinks: number
  }
): Layer<never, never, TestConfig> {
  return Layer.succeed(TestConfig.Tag)(TestConfig(params))
}

/**
 * Constructs a new `TestConfig` with the default settings.
 *
 * @tsplus static effect/core/testing/TestConfig.Ops default
 * @category constructors
 * @since 1.0.0
 */
export const defaultTestConfig: Layer<never, never, TestConfig> = TestConfig.live({
  repeats: 100,
  retries: 100,
  samples: 200,
  shrinks: 1000
})

/**
 * The number of times to repeat tests to ensure they are stable.
 *
 * @tsplus static effect/core/testing/TestConfig.Ops repeats
 * @category getters
 * @since 1.0.0
 */
export const repeats: Effect<TestConfig, never, number> = Effect.serviceWith(
  TestConfig.Tag,
  (_) => _.repeats
)

/**
 * The number of times to retry flaky tests.
 *
 * @tsplus static effect/core/testing/TestConfig.Ops retries
 * @category getters
 * @since 1.0.0
 */
export const retries: Effect<TestConfig, never, number> = Effect.serviceWith(
  TestConfig.Tag,
  (_) => _.retries
)

/**
 * The number of sufficient samples to check for a random variable.
 *
 * @tsplus static effect/core/testing/TestConfig.Ops samples
 * @category getters
 * @since 1.0.0
 */
export const samples: Effect<TestConfig, never, number> = Effect.serviceWith(
  TestConfig.Tag,
  (_) => _.samples
)

/**
 * The maximum number of shrinkings to minimize large failures.
 *
 * @tsplus static effect/core/testing/TestConfig.Ops shrinks
 * @category getters
 * @since 1.0.0
 */
export const shrinks: Effect<TestConfig, never, number> = Effect.serviceWith(
  TestConfig.Tag,
  (_) => _.shrinks
)
