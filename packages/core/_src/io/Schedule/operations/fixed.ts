import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

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
 * @tsplus static ets/Schedule/Ops fixed
 */
export function fixed(
  interval: LazyArg<Duration>
): Schedule<
  Tuple<[Option<Tuple<[number, number]>>, number]>,
  unknown,
  unknown,
  number
> {
  return makeWithState(Tuple(Option.emptyOf(), 0), (now, _, { tuple: [option, n] }) =>
    Effect.succeed(() => {
      const interval0 = interval()
      const intervalMillis = interval0.millis
      return option.fold(
        () =>
          Tuple(
            Tuple(Option.some(Tuple(now, now + intervalMillis)), n + 1),
            n,
            Decision.Continue(Interval.after(now + intervalMillis))
          ),
        ({ tuple: [startMillis, lastRun] }) => {
          const runningBehind = now > (lastRun + intervalMillis)
          const boundary = interval0 == (0).millis
            ? interval0
            : new Duration(intervalMillis - ((now - startMillis) % intervalMillis))
          const sleepTime = boundary == (0).millis ? interval0 : boundary
          const nextRun = runningBehind ? now : now + sleepTime.millis
          return Tuple(
            Tuple(Option.some(Tuple(startMillis, nextRun)), n + 1),
            n,
            Decision.Continue(Interval.after(nextRun))
          )
        }
      )
    }))
}
