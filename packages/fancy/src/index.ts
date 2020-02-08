import * as React from "react";
import { effect as T } from "@matechs/effect";
import { page as nextPage } from "./fancy-next";
import { State, stateURI, runner } from "./fancy";
import { pipe } from "fp-ts/lib/pipeable";
import { NextContext, nextContextURI } from "./next-ctx";
import { some, none } from "fp-ts/lib/Option";
import * as Ei from "fp-ts/lib/Either";
import * as MR from "mobx-react";
import * as M from "mobx";
import { Type, Errors } from "io-ts";
import * as R from "fp-ts/lib/Record";

// alpha
/* istanbul ignore file */

export interface App<S> {
  _S: S;

  page: (
    view: T.Effect<State<S>, never, React.FC<{}>>
  ) => typeof React.Component;
  withState: <K extends Array<keyof S>>(
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
    f: (s: { [k in K[number]]: S[k] }) => View<R, A>
  ) => T.Effect<State<{ [k in K[number]]: S[k] }> & R, never, React.FC<A>>;
  ui: {
    of: <RUI, P>(uiE: T.Effect<RUI, never, React.FC<P>>) => View<RUI, P>;
    withRun: <RUNR>() => <RUI, P>(
      f: (
        _: <A>(
          _: T.Effect<RUNR, never, A>,
          cb?: ((a: A) => void) | undefined
        ) => void
      ) => T.Effect<RUI, never, React.FC<P>>
    ) => View<RUI & RUNR, P>;
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
  const context = React.createContext<S>({} as any);

  const useState = () => React.useContext(context);

  const ui = <RUI, P>(
    uiE: T.Effect<RUI, never, React.FC<P>>
  ): T.Effect<RUI, never, React.FC<P>> => uiE;

  const initial = pipe(
    stateDef as Record<string, any>,
    R.traverseWithIndex(T.effect)((k: string) =>
      pipe(
        initialState[k as keyof IS],
        T.map(x => M.observable(x))
      )
    ),
    T.map(r => (r as any) as S)
  );

  const enc = (s: S) =>
    pipe(
      s as Record<string, any>,
      R.mapWithIndex((k, x) => stateDef[k as keyof StateDef].encode(M.toJS(x)))
    );

  const dec = (u: unknown): Ei.Either<Errors | Error, S> =>
    pipe(
      u as Record<string, unknown>,
      R.traverseWithIndex(Ei.either)((k, u) =>
        stateDef[k]
          ? pipe(
              (stateDef[k as keyof StateDef].decode(u) as any) as Ei.Either<
                Errors | Error,
                any
              >,
              Ei.map(M.observable)
            )
          : Ei.left(new Error("invalid state"))
      ),
      Ei.map(x => (x as any) as S)
    );

  const page = <RPage>(
    view: T.Effect<RPage, never, React.FC<{}>>
  ): typeof React.Component => nextPage(initial, enc, dec, context)(view);

  const withState = <K extends Array<keyof S>>(keys: K) => <P = {}>() => <
    R = unknown
  >(
    cmpV: View<R, { [k in K[number]]: S[k] } & P>
  ) =>
    pipe(
      cmpV,
      T.map(
        (cmp): React.FC<P> => {
          const state = useState();

          const ns = {} as { [k in K[number]]: S[k] };

          for (const k of keys) {
            ns[k] = state[k];
          }

          const a = MR.observer(cmp);

          return (p: P) =>
            React.createElement(a, {
              ...ns,
              ...p
            });
        }
      )
    );

  const withRun = <RUNR>() => <RUI, P>(
    f: (
      _: <A>(
        _: T.Effect<RUNR, never, A>,
        cb?: ((a: A) => void) | undefined
      ) => void
    ) => T.Effect<RUI, never, React.FC<P>>
  ) => pipe(runner<RUNR>(), T.chain(f));

  const accessS = <K extends Array<keyof S>>(_: K) => <A>(
    f: (s: { [k in K[number]]: S[k] }) => A
  ) => T.access((s: State<{ [k in K[number]]: S[k] }>) => f(s[stateURI].state));

  const accessSM = <K extends Array<keyof S>>(_: K) => <R, A>(
    f: (s: { [k in K[number]]: S[k] }) => View<R, A>
  ) =>
    T.accessM((s: State<{ [k in K[number]]: S[k] }>) => f(s[stateURI].state));

  return {
    _S: {} as S,
    page,
    withState,
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
