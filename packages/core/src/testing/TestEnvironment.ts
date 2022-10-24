/**
 * @tsplus type effect/core/testing/TestEnvironment
 * @category model
 * @since 1.0.0
 */
export type TestEnvironment =
  | Annotations
  | Live
  | Sized
  | TestConfig

/**
 * @tsplus static effect/core/testing/TestEnvironment.Ops live
 * @category environment
 * @since 1.0.0
 */
export const live: Layer<DefaultServices, never, TestEnvironment> = Annotations.live
  .merge(Live.default)
  .merge(Sized.live(100))
  .merge(Live.default.merge(Annotations.live).provideToAndMerge(TestClock.default))
  .merge(TestConfig.default)

/**
 * @tsplus type effect/core/testing/TestEnvironment.Ops
 * @category model
 * @since 1.0.0
 */
export interface TestEnvironmentOps extends Layer<never, never, TestEnvironment> {}

/**
 * @category environment
 * @since 1.0.0
 */
export const TestEnvironment: TestEnvironmentOps = Layer
  .syncEnvironment(DefaultServices.live)
  .provideToAndMerge(live)
