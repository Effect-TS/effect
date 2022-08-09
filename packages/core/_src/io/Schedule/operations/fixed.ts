import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import { DurationInternal } from "@tsplus/stdlib/data/Duration"

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
 * @tsplus static effect/core/io/Schedule.Ops fixed
 */
export function fixed(
  interval: Duration
): Schedule<
  Tuple<[Maybe<Tuple<[number, number]>>, number]>,
  never,
  unknown,
  number
> {
  return makeWithState(
    Tuple(Maybe.empty(), 0),
    (now, _, { tuple: [option, n] }) =>
      Effect.sync(() => {
        const intervalMillis = interval.millis
        return option.fold(
          () =>
            Tuple(
              Tuple(Maybe.some(Tuple(now, now + intervalMillis)), n + 1),
              n,
              Decision.continueWith(Interval.after(now + intervalMillis))
            ),
          ({ tuple: [startMillis, lastRun] }) => {
            const runningBehind = now > (lastRun + intervalMillis)
            const boundary = interval == (0).millis
              ? interval
              : new DurationInternal(intervalMillis - ((now - startMillis) % intervalMillis))
            const sleepTime = boundary == (0).millis ? interval : boundary
            const nextRun = runningBehind ? now : now + sleepTime.millis
            return Tuple(
              Tuple(Maybe.some(Tuple(startMillis, nextRun)), n + 1),
              n,
              Decision.continueWith(Interval.after(nextRun))
            )
          }
        )
      })
  )
}
