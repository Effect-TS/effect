import { effect as T, freeEnv as F } from "@matechs/effect";
import * as S from "@matechs/effect/lib/stream";
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
  (current: StateAccess<State>, action$: S.Stream<T.NoEnv, never, A>): S.Stream<
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
  stream: S.Stream<T.NoEnv, never, S>;
}

export function embed<EPS extends AnyEpic[]>(
  ...epics: EPS
): (
  r: (
    state$: Rxo.StateObservable<Sta<EPS[number]>>
  ) => F.UnionToIntersection<
    Env<Exclude<typeof epics[number], Epic<T.NoEnv, any, any, any>>>
  >
) => Rxo.Epic<Act<EPS[number]>, AOut<EPS[number]>, Sta<EPS[number]>> {
  type Action = Act<EPS[number]>;
  type State = Sta<EPS[number]>;
  type ActionOut = AOut<EPS[number]>;
  type REnv = F.UnionToIntersection<
    Env<Exclude<typeof epics[number], Epic<T.NoEnv, any, any, any>>>
  >;
  return r =>
    Rxo.combineEpics(
      ...pipe(
        epics as Epic<REnv, State, Action, ActionOut>[],
        A.map(
          epic => (
            action$: Rxo.ActionsObservable<Action>,
            state$: Rxo.StateObservable<State>
          ) =>
            R.runToObservable(
              T.provideAll(r(state$))(
                R.toObservable(
                  epic(
                    {
                      value: T.sync(() => state$.value),
                      stream: R.encaseObservable(state$, toNever)
                    },
                    R.encaseObservable(action$, toNever)
                  )
                )
              )
            )
        )
      )
    );
}

export function epic<S, A extends Action>(): <R, O extends A>(
  e: (
    current: StateAccess<S>,
    action$: S.Stream<T.NoEnv, never, A>
  ) => S.Stream<R, never, O>
) => Epic<R, S, A, O> {
  return e => e as any;
}
