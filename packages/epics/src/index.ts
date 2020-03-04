import { effect as T, freeEnv as F, stream as S } from "@matechs/effect";
import * as R from "@matechs/rxjs";
import * as A from "fp-ts/lib/Array";
import { Action } from "redux";
import * as Rxo from "redux-observable";
import { pipe } from "fp-ts/lib/pipeable";
import { flow } from "fp-ts/lib/function";

export const stateAccessURI = "@matechs/epics/stateAccess";

export interface StateAccess<S> {
  [stateAccessURI]: {
    value: T.Effect<T.NoEnv, never, S>;
    stream: S.Stream<T.NoEnv, never, S>;
  };
}

export interface Epic<R, State, A extends Action<any>, O extends A> {
  _A: A;
  _O: O;
  _R: R;
  _S: State;
  (
    current: StateAccess<State>[typeof stateAccessURI],
    action$: S.Stream<T.NoEnv, never, A>
  ): S.Stream<R, never, O>;
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

type EpicsEnvType<EPS extends AnyEpic> = F.UnionToIntersection<
  Env<Exclude<EPS, Epic<T.NoEnv, any, any, any>>>
>;

export function embed<EPS extends AnyEpic[]>(
  ...epics: EPS
): (
  provider: <A>(
    input: T.Effect<EpicsEnvType<typeof epics[number]>, never, A>
  ) => T.Effect<StateAccess<Sta<EPS[number]>>, never, A>
) => Rxo.Epic<Act<EPS[number]>, AOut<EPS[number]>, Sta<EPS[number]>> {
  type EPSType = EPS[number];
  type Action = Act<EPSType>;
  type State = Sta<EPSType>;
  type ActionOut = AOut<EPSType>;
  type REnv = EpicsEnvType<EPSType>;
  return provider =>
    Rxo.combineEpics(
      ...pipe(
        epics as Epic<REnv, State, Action, ActionOut>[],
        A.map(
          epic => (
            action$: Rxo.ActionsObservable<Action>,
            state$: Rxo.StateObservable<State>
          ) => {
            const stateAccess: StateAccess<State> = {
              [stateAccessURI]: {
                value: T.sync(() => state$.value),
                stream: R.encaseObservable(state$, toNever)
              }
            };
            return R.runToObservable(
              flow(
                provider,
                T.provideS(stateAccess)
              )(
                R.toObservable(
                  epic(
                    stateAccess[stateAccessURI],
                    R.encaseObservable(action$, toNever)
                  )
                )
              )
            );
          }
        )
      )
    );
}

export function epic<S, A extends Action>(): <R, O extends A>(
  e: (
    current: StateAccess<S>[typeof stateAccessURI],
    action$: S.Stream<T.NoEnv, never, A>
  ) => S.Stream<R, never, O>
) => Epic<R, S, A, O> {
  return e => e as any;
}

type StateOf<K> = K extends StateAccess<infer A> ? A : never;

export type CombinedEnv<EPS extends AnyEpic[]> = F.UnionToIntersection<
  {
    [k in keyof EPS]: EPS[k] extends AnyEpic
      ? Exclude<EPS[k]["_R"], StateAccess<any>> &
          (Extract<EPS[k]["_R"], StateAccess<any>> extends infer R &
            StateAccess<StateOf<EPS[k]["_R"]>>
            ? R
            : never)
      : never;
  }[number]
>;

// experimental, strips StateAccess and lift
/* istanbul ignore next */
export function liftEmbed<EPS extends AnyEpic[]>(...epics: EPS) {
  return T.access((_: CombinedEnv<EPS>) =>
    embed(...epics)(T.provideR(_ as any))
  );
}
