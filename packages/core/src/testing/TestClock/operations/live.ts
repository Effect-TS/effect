import { Live } from "@effect/core/testing/Live"
import { SuspendedWarningData } from "@effect/core/testing/TestClock/_internal/SuspendedWarningData"
import { TestClockInternal } from "@effect/core/testing/TestClock/_internal/TestClockInternal"
import { WarningData } from "@effect/core/testing/TestClock/_internal/WarningData"

/**
 * Constructs a new `TestClock`.
 *
 * @tsplus static effect/core/testing/TestClock.Ops live
 * @category environment
 * @since 1.0.0
 */
export function live(data: TestClock.Data): Layer<Annotations | Live, never, TestClock> {
  return Layer.scoped(
    TestClock.Tag,
    Do(($) => {
      const live = $(Effect.service(Live.Tag))
      const annotations = $(Effect.service(Annotations.Tag))
      const clockState = $(Effect.sync(Ref.unsafeMake(data)))
      const warningState = $(Ref.Synchronized.make(WarningData.Start))
      const suspendedWarningState = $(Ref.Synchronized.make(SuspendedWarningData.Start))
      const testClock = new TestClockInternal(
        clockState,
        live,
        annotations,
        warningState,
        suspendedWarningState
      )
      $(Effect.withClockScoped(testClock))
      $(Effect.addFinalizer(testClock.warningDone.zipRight(testClock.suspendedWarningDone)))
      return testClock
    })
  )
}
