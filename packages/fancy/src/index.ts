import * as React from "react";
import { effect as T } from "@matechs/effect";
import { page as nextPage } from "./fancy-next";
import { State, stateURI, runner } from "./fancy";
import { pipe } from "fp-ts/lib/pipeable";
import { Type } from "io-ts";
import { Actions, actionsURI, hasActions } from "./actions";
import { NextContext, nextContextURI } from "./next-ctx";
import { some, none } from "fp-ts/lib/Option";

// alpha
/* istanbul ignore file */

export type Cont<Action> = (
  a: Action,
  ...rest: Action[]
) => T.Effect<unknown, never, Action[]>;

export interface App<R, S, A> {
  page: (
    view: T.Effect<State<S>, never, React.FC<{}>>
  ) => (initial: T.UIO<S>) => typeof React.Component;
  useState: () => S;
  dispatch: Cont<A>;
  withState: Transformer<{
    state: S;
  }>;
  ui: {
    of: <RUI, P>(uiE: T.Effect<RUI, never, React.FC<P>>) => View<RUI & R, P>;
    withRun: <RUNR>() => <RUI, P>(
      f: (
        _: <A>(
          _: T.Effect<RUNR & R, never, A>,
          cb?: ((a: A) => void) | undefined
        ) => void
      ) => T.Effect<RUI, never, React.FC<P>>
    ) => View<RUI & RUNR & R, P>;
  };
}

export type Transformer<K> = <P>(cmp: React.FC<K & P>) => React.FC<P>;

export interface View<R = unknown, P = unknown>
  extends T.Effect<R, never, React.FC<P>> {}

export const app = <RApp, S, Action>(
  type: Type<S, unknown>,
  actionType: Type<Action, unknown>,
  handler: (
    dispatch: Cont<Action>
  ) => (action: Action) => T.Effect<RApp, never, any> = () => () => T.unit
): App<RApp, S, Action> => {
  const context = React.createContext<S>({} as any);

  const dispatch: Cont<Action> = (a: Action, ...rest: Action[]) =>
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

  const useState = () => React.useContext(context);

  const ui = <RUI, P>(
    uiE: T.Effect<RUI, never, React.FC<P>>
  ): T.Effect<RUI & RApp, never, React.FC<P>> => uiE;

  const page = <RPage>(view: T.Effect<RPage, never, React.FC<{}>>) => (
    initial: T.UIO<S>
  ): typeof React.Component =>
    nextPage(
      initial,
      type.encode,
      x => type.decode(x),
      actionType,
      context,
      (run: <A>(e: T.Effect<RPage & RApp, never, A>) => void) => action =>
        run(handler(dispatch)(action))
    )(view);

  const withState: Transformer<{ state: S }> = cmp => p => {
    const state = useState();

    return React.createElement(cmp, {
      state,
      ...p
    });
  };

  const withRun = <RUNR>() => <RUI, P>(
    f: (
      _: <A>(
        _: T.Effect<RUNR & RApp, never, A>,
        cb?: ((a: A) => void) | undefined
      ) => void
    ) => T.Effect<RUI, never, React.FC<P>>
  ) => pipe(runner<RUNR & RApp>(), T.chain(f));

  return {
    page,
    useState,
    dispatch,
    withState,
    ui: {
      of: ui,
      withRun
    }
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

export function hasNextContext(u: unknown): u is NextContext {
  return typeof u === "object" && u !== null && nextContextURI in u;
}

export const accessNextContext = T.access((r: unknown) =>
  hasNextContext(r) ? some(r[nextContextURI].ctx) : none
);

export const isBrowser = T.sync(() => typeof window !== "undefined");

export { StateP } from "./fancy";
export { matcher } from "./matcher";
export { NextContext } from "./next-ctx";
