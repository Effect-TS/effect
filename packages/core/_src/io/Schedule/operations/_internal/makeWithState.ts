import type { Decision } from "@effect/core/io/Schedule/Decision"
import { _Env, _In, _Out, _State, ScheduleSym } from "@effect/core/io/Schedule/definition"

export class ScheduleWithStateInternal<State, Env, In, Out> {
  readonly [ScheduleSym]: ScheduleSym = ScheduleSym
  readonly [_Env]!: () => Env
  readonly [_In]!: (_: In) => void
  readonly [_Out]!: () => Out
  readonly [_State]!: State
  constructor(
    readonly initial: State,
    readonly step: (
      now: number,
      input: In,
      state: State
    ) => Effect<Env, never, Tuple<[State, Out, Decision]>>
  ) {}
}

export function makeWithState<State, Env, In, Out>(
  initial: State,
  step: (
    now: number,
    input: In,
    state: State
  ) => Effect<Env, never, Tuple<[State, Out, Decision]>>
): Schedule<State, Env, In, Out> {
  return new ScheduleWithStateInternal(initial, step)
}
