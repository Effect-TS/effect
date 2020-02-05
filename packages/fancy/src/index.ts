import * as React from "react";
import { effect as T } from "@matechs/effect";
import { page } from "./fancy-next";
import { runner, State, stateURI, Runner } from "./fancy";
import { pipe } from "fp-ts/lib/pipeable";
import { Type } from "io-ts";
import { Actions, actionsURI, hasActions } from "./actions";

// alpha
/* istanbul ignore file */

type WithRunner<R, S, P extends {}> = (
  run: <A>(_: T.Effect<R & State<S>, never, A>, cb?: (a: A) => void) => void
) => T.Effect<R & State<S> & Runner<R & State<S>>, never, React.FC<P>>;

export type Cont<Action> = (
  a: Action,
  ...rest: Action[]
) => T.Effect<unknown, never, Action[]>;

export const app = <R>() => <S, Action>(
  initial: () => S,
  type: Type<S, unknown>,
  actionType: Type<Action, unknown>,
  handler: (
    _: Cont<Action>
  ) => (action: Action) => T.Effect<R & State<S>, never, any> = () => () =>
    T.unit
) => {
  const context = React.createContext<S>({} as any);

  const cont: Cont<Action> = (a: Action, ...rest: Action[]) =>
    pipe(
      T.pure<Actions>({
        [actionsURI]: {
          actions: [a, ...rest].map(actionType.encode)
        }
      }),
      T.chainTap(newActions =>
        T.access(r => {
          if (hasActions(r)) {
            r[actionsURI].actions = [
              ...r[actionsURI].actions,
              ...newActions[actionsURI].actions
            ];
          }
        })
      ),
      T.map(_ => [a, ...rest])
    );

  return {
    page: page(
      initial,
      type.encode,
      x => type.decode(x),
      actionType,
      context,
      (run: <A>(e: T.Effect<R & State<S>, never, A>) => void) => action =>
        run(handler(cont)(action))
    ),
    run: runner<R & State<S>>(),
    view: <P extends {}>(f: WithRunner<R, S, P>) =>
      pipe(runner<R & State<S>>(), T.chain(f)),
    useState: () => React.useContext(context),
    dispatch: (run: <A>(e: T.Effect<R, never, A>) => void) => (
      a: Action,
      ...rest: Action[]
    ) =>
      run(
        pipe(
          T.pure<Actions>({
            [actionsURI]: {
              actions: [a, ...rest].map(actionType.encode)
            }
          }),
          T.chainTap(newActions =>
            T.access(r => {
              if (hasActions(r)) {
                r[actionsURI].actions = [
                  ...r[actionsURI].actions,
                  ...newActions[actionsURI].actions
                ];
              }
            })
          ),
          T.map(_ => [a, ...rest])
        )
      )
  };
};

export const accessSM = <S, R, E, A>(f: (s: S) => T.Effect<R, E, A>) =>
  T.accessM((s: State<S>) => f(s[stateURI].state));

export const accessS = <S, A>(f: (s: S) => A) =>
  T.access((s: State<S>) => f(s[stateURI].state));

export const updateS = <S>(f: (s: S) => S) =>
  T.accessM((s: State<S>) =>
    T.sync(() => {
      s[stateURI].version = s[stateURI].version + 1;
      s[stateURI].state = Object.assign({}, f(s[stateURI].state));

      return s[stateURI].state;
    })
  );

export const updateSM = <S, R, E>(f: (s: S) => T.Effect<R, E, S>) =>
  T.accessM((s: State<S>) =>
    pipe(
      f(s[stateURI].state),
      T.chainTap(nS =>
        T.sync(() => {
          s[stateURI].version = s[stateURI].version + 1;
          s[stateURI].state = Object.assign({}, nS);
        })
      )
    )
  );

export { StateP } from "./fancy";
export { matcher } from "./matcher";
