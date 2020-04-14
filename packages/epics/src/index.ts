import { effect as T, freeEnv as F, stream as S } from "@matechs/effect";
import * as R from "@matechs/rxjs";
import * as A from "fp-ts/lib/Array";
import { Action } from "redux";
import * as Rxo from "redux-observable";
import { pipe } from "fp-ts/lib/pipeable";

export interface Epic<R, State, A extends Action<any>, O extends A> {
  _A: A;
  _O: O;
  _R: R;
  _S: State;
  (current: StateAccess<State>, action$: S.StreamAsync<T.NoEnv, never, A>): S.StreamAsync<
    R,
    never,
    O
  >;
}

function toNever(_: any): never {
  /* istanbul ignore next */
  return undefined as never;
}

type AnyEpic = Epic<any, any, any, any> | Epic<any, any, any, never>;

type Env<K extends AnyEpic> = K["_R"];
type Sta<K extends AnyEpic> = K["_S"];
type Act<K extends AnyEpic> = K["_A"];
type AOut<K extends AnyEpic> = K["_O"];

export interface StateAccess<S> {
  value: T.Effect<T.NoEnv, never, S>;
  stream: S.StreamAsync<T.NoEnv, never, S>;
}

type EpicsEnvType<EPS extends AnyEpic> = T.Erase<
  F.UnionToIntersection<Env<Exclude<EPS, Epic<T.NoEnv, any, any, any>>>>,
  T.AsyncContext
>;

export function embed<EPS extends AnyEpic[]>(
  ...epics: EPS
): (
  provider: T.Provider<StateAccess<Sta<EPS[number]>>, EpicsEnvType<typeof epics[number]>>
) => Rxo.Epic<Act<EPS[number]>, AOut<EPS[number]>, Sta<EPS[number]>> {
  type EPSType = EPS[number];
  type Action = Act<EPSType>;
  type State = Sta<EPSType>;
  type ActionOut = AOut<EPSType>;
  type REnv = EpicsEnvType<EPSType>;
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
            };
            return R.runToObservable(
              pipe(
                R.toObservable(epic(stateAccess, R.encaseObservable(action$, toNever))),
                provider,
                T.provideS(stateAccess)
              )
            );
          }
        )
      )
    );
}

export function epic<S, A extends Action>(): <R, O extends A>(
  e: (current: StateAccess<S>, action$: S.StreamAsync<T.NoEnv, never, A>) => S.Stream<R, never, O>
) => Epic<R, S, A, O> {
  return (e) => e as any;
}
