import { Action } from "redux"
import * as Rxo from "redux-observable"

import * as A from "@matechs/core/Array"
import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as F from "@matechs/core/Service"
import * as S from "@matechs/core/Stream"
import * as R from "@matechs/rxjs"

export interface Epic<R, State, A extends Action<any>, O extends A> {
  _A: A
  _O: O
  _R: R
  _S: State
  (current: StateAccess<State>, action$: S.Async<A>): S.AsyncR<R, O>
}

function toNever(_: any): never {
  /* istanbul ignore next */
  return undefined as never
}

type AnyEpic = Epic<any, any, any, any> | Epic<any, any, any, never>

type Env<K extends AnyEpic> = K["_R"]
type Sta<K extends AnyEpic> = K["_S"]
type Act<K extends AnyEpic> = K["_A"]
type AOut<K extends AnyEpic> = K["_O"]

export interface StateAccess<S> {
  value: T.Sync<S>
  stream: S.Async<S>
}

type EpicsEnvType<EPS extends AnyEpic> = F.UnionToIntersection<
  Env<Exclude<EPS, Epic<unknown, any, any, any>>>
>

export function embed<EPS extends AnyEpic[]>(
  ...epics: EPS
): (
  provider: (
    _: T.Effect<any, EpicsEnvType<typeof epics[number]>, never, any>
  ) => T.Effect<any, StateAccess<Sta<EPS[number]>>, never, any>
) => Rxo.Epic<Act<EPS[number]>, AOut<EPS[number]>, Sta<EPS[number]>> {
  type EPSType = EPS[number]
  type Action = Act<EPSType>
  type State = Sta<EPSType>
  type ActionOut = AOut<EPSType>
  type REnv = EpicsEnvType<EPSType>
  return (provider) =>
    Rxo.combineEpics(
      ...pipe(
        epics as Epic<REnv, State, Action, ActionOut>[],
        A.map(
          (epic) => (
            action$: Rxo.ActionsObservable<Action>,
            state$: Rxo.StateObservable<State>
          ) => {
            const stateAccess: StateAccess<State> = {
              value: T.sync(() => state$.value),
              stream: R.encaseObservable(state$, toNever)
            }
            return R.runToObservable(
              pipe(
                R.toObservable(epic(stateAccess, R.encaseObservable(action$, toNever))),
                provider,
                T.provide(stateAccess)
              )
            )
          }
        )
      )
    )
}

export function epic<S, A extends Action>(): <R, O extends A>(
  e: (current: StateAccess<S>, action$: S.Async<A>) => S.AsyncR<R, O>
) => Epic<R, S, A, O> {
  return (e) => e as any
}
