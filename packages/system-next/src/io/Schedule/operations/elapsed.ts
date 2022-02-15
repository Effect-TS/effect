import { Tuple } from "../../../collection/immutable/Tuple"
import { Duration } from "../../../data/Duration"
import { Option } from "../../../data/Option"
import { Effect } from "../../Effect"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import { Interval } from "../Interval"
import { makeWithState } from "./_internal/makeWithState"

/**
 * A schedule that occurs everywhere, which returns the total elapsed duration
 * since the first step.
 *
 * @tsplus static ets/ScheduleOps elapsed
 */
export const elapsed: Schedule.WithState<
  Option<number>,
  unknown,
  unknown,
  Duration
> = makeWithState(Option.emptyOf(), (now, _, state) =>
  Effect.succeed(
    state.fold(
      () =>
        Tuple(Option.some(now), Duration.Zero, Decision.Continue(Interval.after(now))),
      (start) =>
        Tuple(
          Option.some(start),
          Duration(now - start),
          Decision.Continue(Interval.after(now))
        )
    )
  )
)
