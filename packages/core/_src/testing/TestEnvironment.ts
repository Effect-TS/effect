/**
 * @tsplus type effect/core/testing/TestEnvironment
 */
export type TestEnvironment =
  | Annotations
  | Live
  | Sized
  | TestConfig

/**
 * @tsplus static effect/core/testing/TestEnvironment.Ops live
 */
export const live: Layer<DefaultServices, never, TestEnvironment> = Annotations.live
  .merge(Live.default)
  .merge(Sized.live(100))
  .merge(Live.default.merge(Annotations.live).provideToAndMerge(TestClock.default))
  .merge(TestConfig.default)

/**
 * @tsplus type effect/core/testing/TestEnvironment.Ops
 */
export interface TestEnvironmentOps extends Layer<never, never, TestEnvironment> {}
export const TestEnvironment: TestEnvironmentOps = Layer
  .succeedEnvironment(DefaultServices.live)
  .provideToAndMerge(live)
