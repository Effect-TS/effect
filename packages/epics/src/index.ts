import * as T from "@matechs/effect";
import * as S from "@matechs/effect/lib/stream";
import * as R from "@matechs/rxjs";

import { Action } from "redux";
import * as Rxo from "redux-observable";

export type Epic<R, A extends Action<any>, State> = (
  current: State
) => (action$: S.Stream<T.NoEnv, never, A>) => S.Stream<R, never, A>;

function toNever(e: any): never {
  return undefined as never;
}

export function embed<R, A extends Action, State>(
  r: R,
  epic: Epic<R, A, State>
): Rxo.Epic<A, A, State> {
  return (action$, state$) =>
    R.runToObservable(
      T.provideAll(r)(
        R.toObservable(epic(state$.value)(R.encaseObservable(action$, toNever)))
      )
    );
}

