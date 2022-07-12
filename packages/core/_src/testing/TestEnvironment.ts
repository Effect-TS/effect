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
  .and(Live.default)
  .and(Sized.live(100))
  .and(Live.default.and(Annotations.live) >> TestClock.default)
  .and(TestConfig.default)

/**
 * @tsplus type effect/core/testing/TestEnvironment.Ops
 */
export interface TestEnvironmentOps extends Layer<never, never, TestEnvironment> {}
export const TestEnvironment: TestEnvironmentOps = Layer.succeedEnvironment(
  DefaultServices.live
) >> live
