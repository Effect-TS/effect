/**
 * Retries constructing this layer according to the specified schedule.
 *
 * @tsplus fluent ets/Layer retry
 */
export function retry_<RIn, E, ROut, S, RIn1, X>(
  self: Layer<RIn, E, ROut>,
  schedule: LazyArg<Schedule<S, RIn1, E, X>>
): Layer<RIn & RIn1, E, ROut> {
  return Layer.suspend(() => {
    const schedule0 = schedule()
    const stateTag = Tag<UpdateState<S>>()

    return Layer.succeed(stateTag)({ state: schedule0._initial }).flatMap((env) =>
      loop(self, schedule0, stateTag, env.get(stateTag).state)
    )
  })
}

/**
 * Retries constructing this layer according to the specified schedule.
 *
 * @tsplus static ets/Layer/Aspects retry
 */
export const retry = Pipeable(retry_)

function loop<S, RIn, E, ROut, RIn1, X>(
  self: Layer<RIn, E, ROut>,
  schedule: Schedule<S, RIn1, E, X>,
  stateTag: Tag<UpdateState<S>>,
  s: S
): Layer<RIn & RIn1, E, ROut> {
  return self.catchAll((e) =>
    update(schedule, stateTag, e, s).flatMap((env) => loop(self, schedule, stateTag, env.get(stateTag).state).fresh())
  )
}

interface UpdateState<S> {
  readonly state: S
}

function update<S, RIn, E, X>(
  schedule: Schedule<S, RIn, E, X>,
  stateTag: Tag<UpdateState<S>>,
  e: E,
  s: S
): Layer<RIn, E, Has<UpdateState<S>>> {
  return Layer.fromEffect(stateTag)(
    Clock.currentTime.flatMap((now) =>
      schedule._step(now, e, s).flatMap(({ tuple: [state, _, decision] }) =>
        decision._tag === "Done"
          ? Effect.fail(e)
          : Clock.sleep(new Duration(decision.interval.startMillis - now)).as({
            state
          })
      )
    )
  )
}
