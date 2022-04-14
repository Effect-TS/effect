import type { Decision } from "@effect/core/io/Schedule/Decision";
import { _Env, _In, _Out, _State, ScheduleSym } from "@effect/core/io/Schedule/definition";

export class ScheduleWithStateInternal<State, Env, In, Out> {
  readonly [ScheduleSym]: ScheduleSym = ScheduleSym;
  readonly [_Env]!: (_: Env) => void;
  readonly [_In]!: (_: In) => void;
  readonly [_Out]!: () => Out;
  readonly [_State]!: State;
  constructor(
    readonly _initial: State,
    readonly _step: (
      _now: number,
      _in: In,
      _state: State,
      _etsTrace?: string
    ) => Effect<Env, never, Tuple<[State, Out, Decision]>>
  ) {}
}

export function makeWithState<State, Env, In, Out>(
  initial: State,
  step: (
    now: number,
    input: In,
    state: State,
    __tsplusTrace?: string
  ) => Effect<Env, never, Tuple<[State, Out, Decision]>>
): Schedule<State, Env, In, Out> {
  return new ScheduleWithStateInternal(initial, step);
}
