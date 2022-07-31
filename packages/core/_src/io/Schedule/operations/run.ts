/**
 * Runs a schedule using the provided inputs, and collects all outputs.
 *
 * @tsplus static effect/core/io/Schedule.Aspects run
 * @tsplus pipeable effect/core/io/Schedule run
 */
export function run<In>(now: number, input: Collection<In>) {
  return <State, Env, Out>(self: Schedule<State, Env, In, Out>): Effect<Env, never, Chunk<Out>> =>
    runLoop(self, now, List.from(input), self.initial, Chunk.empty<Out>())
}

function runLoop<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>,
  now: number,
  inputs: List<In>,
  state: State,
  acc: Chunk<Out>
): Effect<Env, never, Chunk<Out>> {
  if (inputs.isNil()) {
    return Effect.succeed(acc)
  }
  const input = inputs.head
  const nextInputs = inputs.tail
  return self
    .step(now, input, state)
    .flatMap(({ tuple: [state, out, decision] }) => {
      switch (decision._tag) {
        case "Done": {
          return Effect.sync(acc.append(out))
        }
        case "Continue": {
          return runLoop(
            self,
            decision.intervals.start,
            nextInputs,
            state,
            acc.append(out)
          )
        }
      }
    })
}
