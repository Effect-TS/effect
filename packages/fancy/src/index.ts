import * as React from "react";
import { effect as T } from "@matechs/effect";
import { page } from "./fancy-next";
import { dispatcherOf, State, stateURI, Dispatcher } from "./fancy";
import { pipe } from "fp-ts/lib/pipeable";
import { Type } from "io-ts";

// alpha
/* istanbul ignore file */

type WithDisp<R, S, P extends {}> = (
  dispatcher: <A>(
    _: T.Effect<R & State<S>, never, A>,
    cb?: (a: A) => void
  ) => void
) => T.Effect<R & State<S> & Dispatcher<R & State<S>>, never, React.FC<P>>;

export const app = <R>() => <S>(initial: () => S, type: Type<S, unknown>) => {
  const context = React.createContext<S>({} as any);

  return {
    page: page(initial, type.encode, x => type.decode(x), context),
    dispatcher: dispatcherOf<R & State<S>>(),
    view: <P extends {}>(f: WithDisp<R, S, P>) =>
      pipe(dispatcherOf<R & State<S>>(), T.chain(f)),
    useState: () => React.useContext(context)
  };
};

export const accessSM = <S, R, E, A>(f: (s: S) => T.Effect<R, E, A>) =>
  T.accessM((s: State<S>) => f(s[stateURI].state));

export const accessS = <S, A>(f: (s: S) => A) =>
  T.access((s: State<S>) => f(s[stateURI].state));

export const updateS = <S>(f: (s: S) => S) =>
  T.accessM((s: State<S>) =>
    T.sync(() => {
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
          s[stateURI].state = Object.assign({}, nS);
        })
      )
    )
  );

export { StateP } from "./fancy";
