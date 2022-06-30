/**
 * Runs a schedule using the provided inputs, and collects all outputs.
 *
 * @tsplus static effect/core/io/Schedule.Aspects run
 * @tsplus pipeable effect/core/io/Schedule run
 */
export function run<In>(now: number, input: Collection<In>, __tsplusTrace?: string) {
  return <State, Env, Out>(self: Schedule<State, Env, In, Out>): Effect<Env, never, Chunk<Out>> =>
    runLoop(self, now, ListBuffer.from(input), self._initial, Chunk.empty<Out>())
}

function runLoop<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>,
  now: number,
  inputs: ListBuffer<In>,
  state: State,
  acc: Chunk<Out>
): Effect<Env, never, Chunk<Out>> {
  if (inputs.length === 0) {
    return Effect.succeedNow(acc)
  }
  const input = inputs.unprepend()
  return self
    ._step(now, input, state)
    .flatMap(({ tuple: [_, out, decision] }) =>
      decision._tag === "Done"
        ? Effect.succeed(acc.append(out))
        : runLoop(
          self,
          decision.interval.startMillis,
          inputs,
          state,
          acc.append(out)
        )
    )
}
