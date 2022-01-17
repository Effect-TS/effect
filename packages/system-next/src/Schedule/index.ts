import type * as Tp from "../Collections/Immutable/Tuple"
import type * as T from "../Effect"

type Decision = {}

export interface Schedule<Env, In, Out> {
  readonly _Env: (_: Env) => void
  readonly _In: (_: In) => void
  readonly _Out: () => Out
  readonly _State: unknown
  readonly _initial: this["_State"]

  readonly step: (
    __now: number,
    __in: In,
    __state: this["_State"],
    __trace?: string
  ) => T.Effect<Env, never, Tp.Tuple<[this["_State"], Out, Decision]>>
}

export declare namespace Schedule {
  interface WithState<Env, In, Out, State> extends Schedule<Env, In, Out> {
    readonly _State: State
  }
}

export function makeWithState<Env, In, Out, State>(
  step: (
    __now: number,
    __in: In,
    __state: State,
    __trace?: string
  ) => T.Effect<Env, never, Tp.Tuple<[State, Out, Decision]>>
): Schedule.WithState<Env, In, Out, State> {
  return { step } as any
}
