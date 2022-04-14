/**
 * Runs a schedule using the provided inputs, and collects all outputs.
 *
 * @tsplus fluent ets/Schedule run
 * @tsplus fluent ets/Schedule/WithState run
 */
export function run_<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>,
  now: number,
  input: Collection<In>,
  __tsplusTrace?: string
): RIO<Env, Chunk<Out>> {
  return runLoop(self, now, ListBuffer.from(input), self._initial, Chunk.empty<Out>());
}

/**
 * Runs a schedule using the provided inputs, and collects all outputs.
 *
 * @tsplus static ets/Schedule/Aspects run
 */
export const run = Pipeable(run_);

function runLoop<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>,
  now: number,
  inputs: ListBuffer<In>,
  state: State,
  acc: Chunk<Out>
): RIO<Env, Chunk<Out>> {
  if (inputs.length === 0) {
    return Effect.succeedNow(acc);
  }
  const input = inputs.unprepend();
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
    );
}
