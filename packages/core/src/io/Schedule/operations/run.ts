import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"

/**
 * Runs a schedule using the provided inputs, and collects all outputs.
 *
 * @tsplus static effect/core/io/Schedule.Aspects run
 * @tsplus pipeable effect/core/io/Schedule run
 * @category destructors
 * @since 1.0.0
 */
export function run<In>(now: number, input: Iterable<In>) {
  return <State, Env, Out>(
    self: Schedule<State, Env, In, Out>
  ): Effect<Env, never, Chunk.Chunk<Out>> =>
    runLoop(self, now, List.fromIterable(input), self.initial, List.nil()).map((list) =>
      Chunk.fromIterable(List.reverse(list))
    )
}

function runLoop<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>,
  now: number,
  inputs: List.List<In>,
  state: State,
  acc: List.List<Out>
): Effect<Env, never, List.List<Out>> {
  if (List.isNil(inputs)) {
    return Effect.succeed(acc)
  }
  const input = inputs.head
  const nextInputs = inputs.tail
  return self
    .step(now, input, state)
    .flatMap(([state, out, decision]) => {
      switch (decision._tag) {
        case "Done": {
          return Effect.sync(pipe(acc, List.prepend(out)))
        }
        case "Continue": {
          return runLoop(
            self,
            decision.intervals.start,
            nextInputs,
            state,
            pipe(acc, List.prepend(out))
          )
        }
      }
    })
}
