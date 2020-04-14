import * as React from "react";
import { effect as T } from "@matechs/effect";
import { State, stateURI, runner } from "./fancy";
import { pipe } from "fp-ts/lib/pipeable";
import { NextContext, nextContextURI } from "./next-ctx";
import * as MR from "mobx-react";
import { Lazy } from "fp-ts/lib/function";
import { ComponentProps, componentPropsURI } from "./componentProps";
import { some, none } from "fp-ts/lib/Option";

// alpha
/* istanbul ignore file */

export interface Run<R> {
  <RUI, P>(
    _: <A>(_: T.Effect<R, never, A>, cb?: ((a: A) => void) | undefined) => Lazy<void>,
    dispose: Lazy<void>
  ): T.Effect<RUI, never, React.FC<P>>;
}

export interface UI {
  of: <RUI, P = {}>(uiE: View<RUI, P>) => View<RUI, P>;
  withRun: <RUNR>() => <RUI, P>(
    f: (
      _: <A>(_: T.TaskEnv<RUNR, A>, cb?: ((a: A) => void) | undefined) => Lazy<void>,
      dispose: Lazy<void>
    ) => T.Effect<RUI, never, React.FC<P>>
  ) => View<RUNR & RUI, P>;
  withState: <S extends State<any>>() => <P>(
    C: React.FC<(S extends State<infer A> ? A : never) & P>
  ) => View<S, P>;
}

export interface View<R = unknown, P = unknown> extends T.Effect<R, never, React.FC<P>> {}

export const UI: UI = {
  of: <RUI, P>(uiE: T.Effect<RUI, never, React.FC<P>>): T.Effect<RUI, never, React.FC<P>> => uiE,
  withRun: <RUNR>() => <RUI, P>(
    f: (
      _: <A>(_: T.TaskEnv<RUNR, A>, cb?: ((a: A) => void) | undefined) => Lazy<void>,
      dispose: Lazy<void>
    ) => T.Effect<RUI, never, React.FC<P>>
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
): T.Effect<S, never, A> => T.access((s: S) => f(s[stateURI].state));

export const accessSM = <S extends State<any>>() => <R, E, A>(
  f: (_: S extends State<infer A> ? A : never) => T.Effect<R, E, A>
): T.Effect<S & R, E, A> => T.accessM((s: S) => f(s[stateURI].state));

export function hasNextContext(u: unknown): u is NextContext {
  return u !== undefined && typeof u === "object" && u !== null && nextContextURI in u;
}

export const accessNextContext = T.access((r: unknown) =>
  hasNextContext(r) ? some(r[nextContextURI].ctx) : none
);

export const isBrowser = T.sync(() => typeof window !== "undefined");

export const accessP = <P, A>(f: (_: P) => A) =>
  T.access((_: ComponentProps<P>) => f(_[componentPropsURI].props));

export const accessPM = <P, R, E, A>(f: (_: P) => T.Effect<R, E, A>) =>
  T.accessM((_: ComponentProps<P>) => f(_[componentPropsURI].props));

export { State } from "./fancy";
export { ComponentProps } from "./componentProps";
export { page } from "./page";
export { pageSSG } from "./pageSSG";
export { react } from "./react";
export { reactAsync } from "./reactAsync";
