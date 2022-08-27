import { Driver } from "@effect/core/io/Schedule/Driver"
import { DurationInternal } from "@tsplus/stdlib/data/Duration"

/**
 * Returns a driver that can be used to step the schedule, appropriately
 * handling sleeping.
 *
 * @tsplus getter effect/core/io/Schedule driver
 */
export function driver<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>
): Effect<never, never, Driver<State, Env, In, Out>> {
  return Ref.make<Tuple<[Maybe<Out>, State]>>(Tuple(Maybe.none, self.initial)).map((ref) => {
    const last: Effect<never, NoSuchElement, Out> = ref.get.flatMap(({ tuple: [element, _] }) =>
      element.fold(Effect.failSync(new NoSuchElement()), (out) => Effect.succeed(out))
    )

    const reset: Effect<never, never, void> = ref.set(Tuple(Maybe.none, self.initial))

    const state: Effect<never, never, State> = ref.get.map((tuple) => tuple.get(1))

    return new Driver(next(self, ref), last, reset, state)
  })
}

function next<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>,
  ref: Ref<Tuple<[Maybe<Out>, State]>>
) {
  return (input: In): Effect<Env, Maybe<never>, Out> =>
    Do(($) => {
      const state = $(ref.get.map((tuple) => tuple.get(1)))
      const now = $(Clock.currentTime)
      const decision = $(self.step(now, input, state))
      return { now, decision }
    }).flatMap(({ now, decision: { tuple: [state, out, decision] } }) =>
      decision._tag === "Done"
        ? ref.set(Tuple(Maybe.some(out), state))
          .zipRight(Effect.fail(Maybe.none))
        : ref.set(Tuple(Maybe.some(out), state))
          .zipRight(
            Effect.sleep(new DurationInternal(decision.intervals.start - now)).as(out)
          )
    )
}
