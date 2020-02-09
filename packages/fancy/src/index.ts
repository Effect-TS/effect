import * as React from "react";
import { effect as T } from "@matechs/effect";
import { page as nextPage } from "./fancy-next";
import { State, stateURI, runner } from "./fancy";
import { pipe } from "fp-ts/lib/pipeable";
import { NextContext, nextContextURI } from "./next-ctx";
import { some, none } from "fp-ts/lib/Option";
import * as MR from "mobx-react";
import * as M from "mobx";
import { Type } from "io-ts";
import { Lazy } from "fp-ts/lib/function";

// alpha
/* istanbul ignore file */

export interface Run<R> {
  <RUI, P>(
    _: <A>(_: T.Effect<R, never, A>, cb?: ((a: A) => void) | undefined) => Lazy<void>
  ): T.Effect<RUI, never, React.FC<P>>;
}

export type SOf<
  R,
  URI extends string & keyof S,
  S extends { [k in URI]: R }
> = State<{ [k in URI]: S[k] }>;

export interface App<S> {
  _S: S;

  page: (view: View<State<S>, {}>) => typeof React.Component;
  withState: <K extends (keyof S)[]>(
    keys: K
  ) => <R = unknown>(
    cmpV: View<R, { [k in K[number]]: S[k] }>
  ) => View<R & State<{ [k in K[number]]: S[k] }>>;
  withStateP: <K extends (keyof S)[]>(
    keys: K
  ) => <P = {}>() => <R = unknown>(
    cmpV: View<R, { [k in K[number]]: S[k] } & P>
  ) => View<R & State<{ [k in K[number]]: S[k] }>, P>;
  accessS: <K extends (keyof S)[]>(
    _: K
  ) => <A>(
    f: (s: { [k in K[number]]: S[k] }) => A
  ) => T.Effect<State<{ [k in K[number]]: S[k] }>, never, A>;
  accessSM: <K extends (keyof S)[]>(
    _: K
  ) => <R, A>(
    f: (s: { [k in K[number]]: S[k] }) => T.Effect<R, never, A>
  ) => T.Effect<State<{ [k in K[number]]: S[k] }> & R, never, A>;
  ui: {
    of: <RUI, P>(uiE: View<RUI, P>) => View<RUI, P>;
    withRun: <RUNR>(f: Run<RUNR>) => View<RUNR, unknown>;
  };
}

export type Transformer<K> = <R, P extends {}>(
  cmp: View<R, P & K>
) => View<React.FC<P>>;

export interface View<R = unknown, P = unknown>
  extends T.Effect<R, never, React.FC<P>> {}

export const app = <
  StateDef extends { [k in keyof StateDef]: Type<any, unknown> },
  IS extends {
    [k in keyof StateDef]: T.UIO<StateDef[k]["_A"]>;
  },
  S = {
    [k in keyof StateDef]: StateDef[k]["_A"] & M.IObservableObject;
  }
>(
  stateDef: StateDef
) => (initialState: IS): App<S> => {
  const ui = <RUI, P>(
    uiE: T.Effect<RUI, never, React.FC<P>>
  ): T.Effect<RUI, never, React.FC<P>> => uiE;

  const page = <RPage>(
    view: T.Effect<RPage, never, React.FC<{}>>
  ): typeof React.Component => nextPage(stateDef, initialState)(view);

  const withStateP = <K extends (keyof S)[]>(keys: K) => <P = {}>() => <
    R = unknown
  >(
    cmpV: View<R, { [k in K[number]]: S[k] } & P>
  ): View<R & State<{ [k in K[number]]: S[k] }>, P> =>
    pipe(
      cmpV,
      T.chain(cmp =>
        T.access((r: State<any>) => {
          const ns = {} as { [k in K[number]]: S[k] };

          for (const k of keys) {
            ns[k] = r[stateURI].state[k];
          }

          const a = MR.observer(cmp);

          return (p: P) =>
            React.createElement(a, {
              ...ns,
              ...p
            });
        })
      )
    );

  const withRun = <RUNR>(f: Run<RUNR>) => pipe(runner<RUNR>(), T.chain(f));

  const accessS = <K extends Array<keyof S>>(_: K) => <A>(
    f: (s: { [k in K[number]]: S[k] }) => A
  ) => T.access((s: State<{ [k in K[number]]: S[k] }>) => f(s[stateURI].state));

  const accessSM = <K extends Array<keyof S>>(_: K) => <R, A>(
    f: (s: { [k in K[number]]: S[k] }) => T.Effect<R, never, A>
  ) =>
    T.accessM((s: State<{ [k in K[number]]: S[k] }>) => f(s[stateURI].state));

  return {
    _S: {} as S,
    page,
    withStateP,
    withState: keys => withStateP(keys)(),
    accessS,
    accessSM,
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

export function hasNextContext(u: unknown): u is NextContext {
  return typeof u === "object" && u !== null && nextContextURI in u;
}

export const accessNextContext = T.access((r: unknown) =>
  hasNextContext(r) ? some(r[nextContextURI].ctx) : none
);

export const isBrowser = T.sync(() => typeof window !== "undefined");

export { StateP } from "./fancy";
export { NextContext } from "./next-ctx";
