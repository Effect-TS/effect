import { Driver } from "@effect/core/io/Schedule/Driver";

/**
 * Returns a driver that can be used to step the schedule, appropriately
 * handling sleeping.
 *
 * @tsplus fluent ets/Schedule driver
 * @tsplus fluent ets/Schedule/WithState driver
 */
export function driver<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>
): RIO<HasClock, Driver<State, Env, In, Out>> {
  return Ref.make<Tuple<[Option<Out>, State]>>(Tuple(Option.none, self._initial)).map((ref) => {
    const last: IO<NoSuchElement, Out> = ref.get().flatMap(({ tuple: [element, _] }) =>
      element.fold(Effect.fail(new NoSuchElement("There is no value left")), (out) => Effect.succeed(out))
    );

    const reset: UIO<void> = ref.set(Tuple(Option.none, self._initial));

    const state: UIO<State> = ref.get().map((tuple) => tuple.get(1));

    return new Driver(next(self, ref), last, reset, state);
  });
}

function next<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  ref: Ref<Tuple<[Option<Out>, State]>>
) {
  return (input: In) =>
    Effect.Do()
      .bind("state", () => ref.get().map((tuple) => tuple.get(1)))
      .bind("now", () => Clock.currentTime)
      .bind("decision", ({ now, state }) => self._step(now, input, state))
      .flatMap(({ now, decision: { tuple: [state, out, decision] } }) =>
        decision._tag === "Done"
          ? ref.set(Tuple(Option.some(out), state)) > Effect.fail(Option.none)
          : ref.set(Tuple(Option.some(out), state)) > Effect.sleep(new Duration(decision.interval.startMillis - now))
      );
}
