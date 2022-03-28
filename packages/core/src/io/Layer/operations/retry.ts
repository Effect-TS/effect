import { Duration } from "../../../data/Duration"
import type { HasClock } from "../../Clock"
import { Clock } from "../../Clock"
import { Effect } from "../../Effect"
import type { Schedule } from "../../Schedule"
import { Layer } from "../definition"

/**
 * Retries constructing this layer according to the specified schedule.
 *
 * @tsplus fluent ets/Layer retry
 */
export function retry_<RIn, E, ROut, S, RIn1, X>(
  self: Layer<RIn, E, ROut>,
  schedule: Schedule.WithState<S, RIn1, E, X>
): Layer<RIn & RIn1 & HasClock, E, ROut>
export function retry_<RIn, E, ROut, RIn1, X>(
  self: Layer<RIn, E, ROut>,
  schedule: Schedule<RIn1, E, X>
): Layer<RIn & RIn1 & HasClock, E, ROut> {
  return Layer.succeed({ state: schedule._initial }).flatMap((env) =>
    loop(self, schedule, env.state)
  )
}

/**
 * Retries constructing this layer according to the specified schedule.
 *
 * @ets_data_first retry_
 */
export function retry<S, RIn1, E, X>(schedule: Schedule.WithState<S, RIn1, E, X>) {
  return <RIn, ROut>(
    self: Layer<RIn, E, ROut>
  ): Layer<RIn & RIn1 & HasClock, E, ROut> => self.retry(schedule)
}

interface UpdateState<S> {
  readonly state: S
}

function update<S, RIn, E, X>(
  schedule: Schedule.WithState<S, RIn, E, X>,
  e: E,
  s: S
): Layer<RIn & HasClock, E, UpdateState<S>> {
  return Layer.fromRawEffect(
    Clock.currentTime.flatMap((now) =>
      schedule._step(now, e, s).flatMap(({ tuple: [state, _, decision] }) =>
        decision._tag === "Done"
          ? Effect.fail(e)
          : Clock.sleep(Duration(decision.interval.startMilliseconds - now)).as({
              state
            })
      )
    )
  )
}

function loop<RIn, E, ROut, S, RIn1, X>(
  self: Layer<RIn, E, ROut>,
  schedule: Schedule.WithState<S, RIn1, E, X>,
  s: S
): Layer<RIn & RIn1 & HasClock, E, ROut> {
  return self.catchAll((e) =>
    update(schedule, e, s).flatMap((env) => loop(self, schedule, env.state).fresh())
  )
}
