import type { Live } from "@effect/core/testing/Live"

/**
 * @tsplus static effect/core/testing/TestClock.Ops default
 */
export const defaultTestClock: Layer<Annotations | Live, never, TestClock> = TestClock.live(
  TestClock.Data(new Date(0).getTime(), List.nil())
)
