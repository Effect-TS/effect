import { effect as T } from "@matechs/effect";
import { page } from "./fancy-next";
import { dispatcherOf, State, stateURI } from "./fancy";
import { pipe } from "fp-ts/lib/pipeable";
import { Type } from "io-ts";

export const app = <R>() => <S>(initial: () => S, type: Type<S, unknown>) => ({
  page: page(initial, type.encode, x => type.decode(x)),
  dispatcher: dispatcherOf<R & State<S>>()
});

export const accessSM = <S, R, E, A>(f: (s: S) => T.Effect<R, E, A>) =>
  T.accessM((s: State<S>) => f(s[stateURI].state));

export const accessS = <S, A>(f: (s: S) => A) =>
  T.access((s: State<S>) => f(s[stateURI].state));

export const updateS = <S>(f: (s: S) => S) =>
  T.accessM((s: State<S>) =>
    T.sync(() => {
      s[stateURI].state = Object.assign({}, f(s[stateURI].state));

      return s[stateURI];
    })
  );

export const updateSM = <S, R, E>(f: (s: S) => T.Effect<R, E, S>) =>
  T.accessM((s: State<S>) =>
    pipe(
      f(s[stateURI].state),
      T.chainTap(nS =>
        T.sync(() => {
          s[stateURI].state = Object.assign({}, nS);
        })
      )
    )
  );
