import { NoSuchElementException } from "@effect/core/io/Cause"
import { Driver } from "@effect/core/io/Schedule/Driver"
import * as Duration from "@fp-ts/data/Duration"
import * as Option from "@fp-ts/data/Option"

/**
 * Returns a driver that can be used to step the schedule, appropriately
 * handling sleeping.
 *
 * @tsplus getter effect/core/io/Schedule driver
 * @category getter
 * @since 1.0.0
 */
export function driver<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>
): Effect<never, never, Driver<State, Env, In, Out>> {
  return Ref.make<readonly [Option.Option<Out>, State]>([Option.none, self.initial]).map((ref) => {
    const last: Effect<never, NoSuchElementException, Out> = ref.get.flatMap(([element, _]) => {
      switch (element._tag) {
        case "None": {
          return Effect.failSync(new NoSuchElementException())
        }
        case "Some": {
          return Effect.succeed(element.value)
        }
      }
    })

    const reset: Effect<never, never, void> = ref.set([Option.none, self.initial])

    const state: Effect<never, never, State> = ref.get.map((tuple) => tuple[1])

    return new Driver(next(self, ref), last, reset, state)
  })
}

function next<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>,
  ref: Ref<readonly [Option.Option<Out>, State]>
) {
  return (input: In): Effect<Env, Option.Option<never>, Out> =>
    Do(($) => {
      const state = $(ref.get.map((tuple) => tuple[1]))
      const now = $(Clock.currentTime)
      const decision = $(self.step(now, input, state))
      return { now, decision }
    }).flatMap(({ now, decision: [state, out, decision] }) =>
      decision._tag === "Done"
        ? ref.set([Option.some(out), state]).zipRight(Effect.fail(Option.none))
        : ref.set([Option.some(out), state]).zipRight(
          Effect.sleep(Duration.millis(decision.intervals.start - now)).as(out)
        )
    )
}
