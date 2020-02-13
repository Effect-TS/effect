import { effect as T } from "@matechs/effect";
import * as Ei from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import * as R from "fp-ts/lib/Record";
import * as M from "mobx";
import * as React from "react";
import { View, ComponentProps } from ".";
import { Fancy, State, stateURI } from "./fancy";
import { isDone } from "@matechs/effect/lib/exit";
import { componentPropsURI } from "./componentProps";

// alpha
/* istanbul ignore file */

export const pageSSG = <K, P>(_V: View<State<K> & ComponentProps<P>, P>) => (
  _I: {
    [k in keyof K]: T.UIO<K[k]>;
  }
) => (
  _P: unknown extends P ? void : {} extends P ? void : T.UIO<P>
): {
  page: React.FC<P>;
  getStaticProps: () => Promise<{ props: P }>;
} => {
  const initial = pipe(
    _I as Record<string, any>,
    R.traverseWithIndex(T.effect)((k: string) =>
      pipe(
        _I[k],
        T.map(x => M.observable(x as any))
      )
    ),
    T.map(r => (r as any) as any)
  );

  const Cmp = (props: P) => {
    const C = pipe(
      initial,
      T.chain(init => {
        const f = new Fancy(_V);
        return pipe(
          f.ui,
          T.chain(Cmp =>
            T.sync(
              (): React.FC => () => {
                React.useEffect(() => () => {
                  f.stop();
                });

                return React.createElement(Cmp);
              }
            )
          ),
          T.provideAll({
            [stateURI]: {
              state: init
            },
            [componentPropsURI]: {
              props
            }
          } as any)
        );
      }),
      T.runSync
    );

    if (Ei.isLeft(C)) {
      return React.createElement("div", {
        children: "Rendering can only be sync and should not fail"
      });
    }

    if (isDone(C.right)) {
      return React.createElement(C.right.value);
    } else {
      return React.createElement("div", {
        children: "Rendering can only be sync and should not fail"
      });
    }
  };

  return {
    page: Cmp,
    getStaticProps: () =>
      _P
        ? T.runToPromise(
            pipe(
              _P as T.Effect<unknown, never, P>,
              T.map(x => ({ props: x }))
            )
          )
        : Promise.resolve({ props: {} } as any)
  };
};
