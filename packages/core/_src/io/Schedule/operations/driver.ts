import { Driver } from "@effect/core/io/Schedule/Driver"

/**
 * Returns a driver that can be used to step the schedule, appropriately
 * handling sleeping.
 *
 * @tsplus getter ets/Schedule driver
 * @tsplus fluent ets/Schedule/WithState driver
 */
export function driver<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>
): Effect.UIO<Driver<State, Env, In, Out>> {
  return Ref.make<Tuple<[Option<Out>, State]>>(Tuple(Option.none, self._initial)).map((ref) => {
    const last: Effect.IO<NoSuchElement, Out> = ref.get().flatMap(({ tuple: [element, _] }) =>
      element.fold(Effect.fail(new NoSuchElement()), (out) => Effect.succeed(out))
    )

    const reset: Effect.UIO<void> = ref.set(Tuple(Option.none, self._initial))

    const state: Effect.UIO<State> = ref.get().map((tuple) => tuple.get(1))

    return new Driver(next(self, ref), last, reset, state)
  })
}

function next<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>,
  ref: Ref<Tuple<[Option<Out>, State]>>
) {
  return (input: In): Effect<Env, Option<never>, Out> =>
    Effect.Do()
      .bind("state", () => ref.get().map((tuple) => tuple.get(1)))
      .bind("now", () => Clock.currentTime)
      .bind("decision", ({ now, state }) => self._step(now, input, state))
      .flatMap(({ now, decision: { tuple: [state, out, decision] } }) =>
        decision._tag === "Done"
          ? ref.set(Tuple(Option.some(out), state)) > Effect.fail(Option.none)
          : ref.set(Tuple(Option.some(out), state)) >
            Effect.sleep(new Duration(decision.interval.startMillis - now)).as(out)
      )
}
