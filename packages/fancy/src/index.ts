import * as React from "react";
import { T, pipe, F, O } from "@matechs/prelude";
import { State, stateURI, runner } from "./fancy";
import { NextContext, nextContextURI } from "./next-ctx";
import * as MR from "mobx-react";
import { ComponentProps, componentPropsURI } from "./componentProps";

// alpha
/* istanbul ignore file */

export interface Run<R> {
  <RUI, P>(
    _: <A>(_: T.SyncR<R, A>, cb?: ((a: A) => void) | undefined) => F.Lazy<void>,
    dispose: F.Lazy<void>
  ): T.SyncR<RUI, React.FC<P>>;
}

export interface UI {
  of: <RUI, P = {}>(uiE: View<RUI, P>) => View<RUI, P>;
  withRun: <RUNR>() => <RUI, P>(
    f: (
      _: <A>(_: T.AsyncR<RUNR, A>, cb?: ((a: A) => void) | undefined) => F.Lazy<void>,
      dispose: F.Lazy<void>
    ) => T.SyncR<RUI, React.FC<P>>
  ) => View<RUNR & RUI, P>;
  withState: <S extends State<any>>() => <P>(
    C: React.FC<(S extends State<infer A> ? A : never) & P>
  ) => View<S, P>;
}

export interface View<R = unknown, P = unknown> extends T.SyncR<R, React.FC<P>> {}

export const UI: UI = {
  of: <RUI, P>(uiE: T.SyncR<RUI, React.FC<P>>): T.SyncR<RUI, React.FC<P>> => uiE,
  withRun: <RUNR>() => <RUI, P>(
    f: (
      _: <A>(_: T.AsyncR<RUNR, A>, cb?: ((a: A) => void) | undefined) => F.Lazy<void>,
      dispose: F.Lazy<void>
    ) => T.SyncR<RUI, React.FC<P>>
  ): View<RUNR & RUI, P> =>
    pipe(
      runner<RUNR>(),
      T.chain(([a, b]) => f(a, b))
    ),
  withState: <S extends State<any>>() => <P>(
    C: React.FC<(S extends State<infer A> ? A : never) & P>
  ) =>
    T.access((s: S) => (p: P) =>
      React.createElement(MR.observer(C), {
        ...s[stateURI].state,
        ...p
      })
    ) as any
};

export const accessS = <S extends State<any>>() => <A>(
  f: (_: S extends State<infer A> ? A : never) => A
): T.SyncR<S, A> => T.access((s: S) => f(s[stateURI].state));

export const accessSM = <S extends State<any>>() => <K, R, E, A>(
  f: (_: S extends State<infer A> ? A : never) => T.Effect<K, R, E, A>
): T.Effect<K, S & R, E, A> => T.accessM((s: S) => f(s[stateURI].state));

export function hasNextContext(u: unknown): u is NextContext {
  return u !== undefined && typeof u === "object" && u !== null && nextContextURI in u;
}

export const accessNextContext = T.access((r: unknown) =>
  hasNextContext(r) ? O.some(r[nextContextURI].ctx) : O.none
);

export const isBrowser = T.sync(() => typeof window !== "undefined");

export const accessP = <P, A>(f: (_: P) => A) =>
  T.access((_: ComponentProps<P>) => f(_[componentPropsURI].props));

export const accessPM = <K, P, R, E, A>(
  f: (_: P) => T.Effect<K, R, E, A>
): T.Effect<K, ComponentProps<P> & R, E, A> =>
  T.accessM((_: ComponentProps<P>) => f(_[componentPropsURI].props));

export { State } from "./fancy";
export { ComponentProps } from "./componentProps";
export { page } from "./page";
export { pageSSG } from "./pageSSG";
export { react } from "./react";
export { reactAsync } from "./reactAsync";
