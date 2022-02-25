import { Chunk } from "../../../collection/immutable/Chunk"
import { List } from "../../../collection/immutable/List"
import type { RIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Schedule } from "../definition"

/**
 * Runs a schedule using the provided inputs, and collects all outputs.
 *
 * @tsplus fluent ets/Schedule run
 * @tsplus fluent ets/ScheduleWithState run
 */
export function run_<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  now: number,
  input: Iterable<In>,
  __tsplusTrace?: string
): RIO<Env, Chunk<Out>> {
  return runLoop(self, now, List.from(input), self._initial, Chunk.empty<Out>())
}

/**
 * Runs a schedule using the provided inputs, and collects all outputs.
 *
 * @ets_data_first run_
 */
export function run<In>(now: number, input: Iterable<In>, __tsplusTrace?: string) {
  return <Env, Out>(self: Schedule<Env, In, Out>): RIO<Env, Chunk<Out>> =>
    self.run(now, input)
}

function runLoop<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  now: number,
  xs: List<In>,
  state: State,
  acc: Chunk<Out>
): RIO<Env, Chunk<Out>> {
  return xs.foldLeft(Effect.succeedNow(acc), (input, xs) =>
    self
      ._step(now, input, state)
      .flatMap(({ tuple: [_, out, decision] }) =>
        decision._tag === "Done"
          ? Effect.succeed(acc.append(out))
          : runLoop(
              self,
              decision.interval.startMilliseconds,
              xs,
              state,
              acc.append(out)
            )
      )
  )
}
