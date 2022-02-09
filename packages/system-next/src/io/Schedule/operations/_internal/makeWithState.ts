import type { Tuple } from "../../../../collection/immutable/Tuple"
import { constant, constVoid } from "../../../../data/Function"
import type { Effect } from "../../../Effect"
import type { Decision } from "../../Decision"
import type { Schedule } from "../../definition"
import { _Env, _In, _Out, _State, ScheduleSym } from "../../definition"

export function makeWithState<State, Env, In, Out>(
  _initial: State,
  _step: (
    _now: number,
    _in: In,
    _state: State,
    _etsTrace?: string
  ) => Effect<Env, never, Tuple<[State, Out, Decision]>>
): Schedule.WithState<State, Env, In, Out> {
  return {
    [ScheduleSym]: ScheduleSym,
    [_Env]: constVoid,
    [_In]: constVoid,
    [_Out]: constant<Out>(undefined as any),
    [_State]: undefined as any,
    _initial,
    _step
  }
}
