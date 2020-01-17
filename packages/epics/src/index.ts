import { effect as T } from "@matechs/effect";
import * as S from "@matechs/effect/lib/stream";
import * as R from "@matechs/rxjs";

import { Action } from "redux";
import * as Rxo from "redux-observable";

export type Epic<R, State, A extends Action<any>> = (
  current: State
) => (action$: S.Stream<T.NoEnv, never, A>) => S.Stream<R, never, A>;

function toNever(_: any): never {
  /* istanbul ignore next */
  return undefined as never;
}

export function embed<R, State, A extends Action>(
  epic: Epic<R, State, A>
): (r: R) => Rxo.Epic<A, A, State> {
  return (r: R) => (action$, state$) =>
    R.runToObservable(
      T.provideAll(r)(
        R.toObservable(epic(state$.value)(R.encaseObservable(action$, toNever)))
      )
    );
}

export function epic<S, A extends Action>(): <R>(
  e: Epic<R, S, A>
) => Epic<R, S, A> {
  return e => e;
}
