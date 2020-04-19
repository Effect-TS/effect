import { T, pipe, Ex } from "@matechs/prelude";
import * as M from "mobx";
import * as React from "react";
import { View, ComponentProps } from ".";
import { Fancy, State, stateURI } from "./fancy";
import { componentPropsURI } from "./componentProps";
import { NextPageContext } from "next";
import { NextContext, nextContextURI } from "./next-ctx";

// alpha
/* istanbul ignore file */

export const page = <K, P, Q>(_V: View<State<K> & ComponentProps<P>, Q>) => (
  _I: {
    [k in keyof K]: T.Sync<K[k]>;
  }
) => <KI extends "static" | "ssr">(
  _KIND: unknown extends P & Q ? void : {} extends P & Q ? void : KI,
  _P: unknown extends P & Q
    ? void
    : {} extends P & Q
    ? void
    : KI extends "static"
    ? T.Sync<P & Q>
    : T.Async<P & Q>
): React.FC<P & Q> => {
  const initial = pipe(
    _I as Record<string, any>,
    T.traverseRecordWithIndex((k: string) =>
      pipe(
        _I[k] as T.Sync<any>,
        T.map((x) => M.observable(x as any))
      )
    ),
    T.map((r) => (r as any) as any)
  );

  const Cmp = (props: P) => {
    const C = pipe(
      initial,
      T.chain((init) => {
        const f = new Fancy(_V);
        return pipe(
          f.ui,
          T.chain((Cmp) =>
            T.sync(
              (): React.FC => () => {
                React.useEffect(() => () => {
                  f.stop();
                });

                return React.createElement(Cmp);
              }
            )
          ),
          T.provide({
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

    if (Ex.isDone(C)) {
      return React.createElement(C.value);
    } else {
      return React.createElement("div", {
        children: "Rendering can only be sync and should not fail"
      });
    }
  };

  if (_P && _KIND && typeof _KIND === "string" && _KIND === "ssr") {
    Cmp.getInitialProps = (ctx: NextPageContext) =>
      T.runToPromise(
        T.provide<NextContext>({
          [nextContextURI]: {
            ctx
          }
        })(_P as T.Effect<unknown, NextContext, never, P>)
      );

    return Cmp;
  } else {
    if (_P && _KIND && typeof _KIND === "string" && _KIND === "static") {
      const props = T.runSync(_P as T.Effect<never, unknown, never, P>);

      if (Ex.isDone(props)) {
        const p = props.value;

        return () =>
          React.createElement(Cmp, {
            ...p
          });
      } else {
        return () =>
          React.createElement("div", {
            children: "Rendering can only be sync and should not fail"
          });
      }
    } else {
      return Cmp;
    }
  }
};
