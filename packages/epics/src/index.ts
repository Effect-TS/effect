import { effect as T, freeEnv as F } from "@matechs/effect";
import * as S from "@matechs/effect/lib/stream";
import * as R from "@matechs/rxjs";
import * as A from "fp-ts/lib/Array";
import { Action } from "redux";
import * as Rxo from "redux-observable";
import { pipe } from "fp-ts/lib/pipeable";

export type Epic<R, State, A extends Action<any>> = (
  current: State
) => (action$: S.Stream<T.NoEnv, never, A>) => S.Stream<R, never, A>;

function toNever(_: any): never {
  /* istanbul ignore next */
  return undefined as never;
}

type Env<K> = K extends Epic<infer R, any, any> ? R : never;
type Sta<K> = K extends Epic<any, infer S, any> ? S : never;
type Act<K> = K extends Epic<any, any, infer A> ? A : never;

export function embed<EPS extends Epic<any, any, any>[]>(
  ...epics: EPS
): (
  r: F.UnionToIntersection<
    Env<Exclude<typeof epics[number], Epic<T.NoEnv, any, any>>>
  >
) => Rxo.Epic<Act<EPS[number]>, Act<EPS[number]>, Sta<EPS[number]>> {
  return (
    r: F.UnionToIntersection<
      Env<Exclude<typeof epics[number], Epic<T.NoEnv, any, any>>>
    >
  ) =>
    Rxo.combineEpics(
      ...pipe(
        epics,
        A.map(epic => (action$: any, state$: any) =>
          R.runToObservable(
            T.provideAll(r)(
              R.toObservable(
                epic(state$.value)(R.encaseObservable(action$, toNever) as any)
              )
            )
          )
        )
      )
    ) as any;
}

export function epic<S, A extends Action>(): <R>(
  e: Epic<R, S, A>
) => Epic<R, S, A> {
  return e => e;
}
