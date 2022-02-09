import { Tuple } from "../../../collection/immutable/Tuple"
import { Duration } from "../../../data/Duration"
import { Option } from "../../../data/Option"
import { Effect } from "../../Effect"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import { Interval } from "../Interval"
import { makeWithState } from "./_internal/makeWithState"

/**
 * A schedule that recurs on a fixed interval. Returns the number of
 * repetitions of the schedule so far.
 *
 * If the action run between updates takes longer than the interval, then the
 * action will be run immediately, but re-runs will not "pile up".
 *
 * ```text
 * |-----interval-----|-----interval-----|-----interval-----|
 * |---------action--------||action|-----|action|-----------|
 * ```
 *
 * @tsplus static ets/ScheduleOps fixed
 */
export function fixed(
  interval: Duration
): Schedule.WithState<
  Tuple<[Option<Tuple<[number, number]>>, number]>,
  unknown,
  unknown,
  number
> {
  return makeWithState(Tuple(Option.emptyOf(), 0), (now, _, { tuple: [option, n] }) =>
    Effect.succeed(() => {
      const intervalMillis = interval.milliseconds
      return option.fold(
        () =>
          Tuple(
            Tuple(Option.some(Tuple(now, now + intervalMillis)), n + 1),
            n,
            Decision.Continue(Interval.after(now + intervalMillis))
          ),
        ({ tuple: [startMillis, lastRun] }) => {
          const runningBehind = now > lastRun + intervalMillis
          const boundary =
            interval === Duration.Zero
              ? interval
              : Duration(intervalMillis - ((now - startMillis) % intervalMillis))
          const sleepTime = boundary === Duration.Zero ? interval : boundary
          const nextRun = runningBehind ? now : now + sleepTime.milliseconds
          return Tuple(
            Tuple(Option.some(Tuple(startMillis, nextRun)), n + 1),
            n,
            Decision.Continue(Interval.after(nextRun))
          )
        }
      )
    })
  )
}
