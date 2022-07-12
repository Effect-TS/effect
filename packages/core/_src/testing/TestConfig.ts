/**
 * The `TestConfig` service provides access to default configuration settings
 * used by tests, including the number of times to repeat tests to ensure
 * they are stable, the number of times to retry flaky tests, the sufficient
 * number of samples to check from a random variable, and the maximum number of
 * shrinkings to minimize large failures.
 *
 * @tsplus type effect/core/testing/TestConfig
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
 */
export interface TestConfigAspects {}

/**
 * Constructs a new `TestConfig` service with the specified settings.
 *
 * @tsplus static effect/core/testing/TestConfig.Ops live
 */
export function live(
  params: {
    readonly repeats: number
    readonly retries: number
    readonly samples: number
    readonly shrinks: number
  }
): Layer<never, never, TestConfig> {
  return Layer.succeed(TestConfig.Tag, TestConfig(params))
}

/**
 * Constructs a new `TestConfig` with the default settings.
 *
 * @tsplus static effect/core/testing/TestConfig.Ops default
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
 */
export const repeats: Effect<TestConfig, never, number> = Effect.serviceWith(
  TestConfig.Tag,
  (_) => _.repeats
)

/**
 * The number of times to retry flaky tests.
 *
 * @tsplus static effect/core/testing/TestConfig.Ops retries
 */
export const retries: Effect<TestConfig, never, number> = Effect.serviceWith(
  TestConfig.Tag,
  (_) => _.retries
)

/**
 * The number of sufficient samples to check for a random variable.
 *
 * @tsplus static effect/core/testing/TestConfig.Ops samples
 */
export const samples: Effect<TestConfig, never, number> = Effect.serviceWith(
  TestConfig.Tag,
  (_) => _.samples
)

/**
 * The maximum number of shrinkings to minimize large failures.
 *
 * @tsplus static effect/core/testing/TestConfig.Ops shrinks
 */
export const shrinks: Effect<TestConfig, never, number> = Effect.serviceWith(
  TestConfig.Tag,
  (_) => _.shrinks
)
