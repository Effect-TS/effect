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
import { NextPageContext } from "next";
import { NextContext, nextContextURI } from "./next-ctx";

// alpha
/* istanbul ignore file */

export const page = <K, P>(_V: View<State<K> & ComponentProps<P>, P>) => (
  _I: {
    [k in keyof K]: T.UIO<K[k]>;
  }
) => (
  _P: unknown extends P
    ? void
    : {} extends P
    ? void
    : T.Effect<NextContext, never, P>
): React.FC<P> => {
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

  if (_P) {
    Cmp.getInitialProps = (ctx: NextPageContext) =>
      T.runToPromise(
        T.provideS<NextContext>({
          [nextContextURI]: {
            ctx
          }
        })(_P as T.Effect<NextContext, never, P>)
      );
  }

  return Cmp;
};
