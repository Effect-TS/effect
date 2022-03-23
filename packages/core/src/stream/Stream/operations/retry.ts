import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../../io/Clock"
import { Effect } from "../../../io/Effect"
import type { Schedule } from "../../../io/Schedule"
import { Stream } from "../definition"

/**
 * When the stream fails, retry it according to the given schedule
 *
 * This retries the entire stream, so will re-execute all of the stream's
 * acquire operations.
 *
 * The schedule is reset as soon as the first element passes through the
 * stream again.
 *
 * @param schedule Schedule receiving as input the errors of the stream.
 *
 * @tsplus fluent ets/Stream retry
 */
export function retry_<R, E, A, S, R2, Z>(
  self: Stream<R, E, A>,
  schedule: LazyArg<Schedule.WithState<S, R2, E, Z>>,
  __tsplusTrace: string
): Stream<R & R2 & HasClock, E, A> {
  return Stream.unwrap(
    schedule()
      .driver()
      .map((driver) => {
        const loop: Stream<R & R2, E, A> = self.catchAll((e) =>
          Stream.unwrap(
            driver.next(e).foldEffect(
              () => Effect.fail(e),
              () => Effect.succeed(loop.tap(() => driver.reset))
            )
          )
        )
        return loop
      })
  )
}

export const retry = Pipeable(retry_)
