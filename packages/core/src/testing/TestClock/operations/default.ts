import type { Live } from "@effect/core/testing/Live"
import * as List from "@fp-ts/data/List"

/**
 * @tsplus static effect/core/testing/TestClock.Ops default
 * @category constructors
 * @since 1.0.0
 */
export const defaultTestClock: Layer<Annotations | Live, never, TestClock> = TestClock.live(
  TestClock.Data(new Date(0).getTime(), List.nil())
)
