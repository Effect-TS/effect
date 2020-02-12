import { effect as T, exit as EX } from "@matechs/effect";
import * as Ei from "fp-ts/lib/Either";
import { Lazy } from "fp-ts/lib/function";
import { none, Option, some, isSome } from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import * as R from "fp-ts/lib/Record";
import * as M from "mobx";
import * as React from "react";
import { View } from ".";
import { Fancy, State, stateURI } from "./fancy";

// alpha
/* istanbul ignore file */

export function reactComponent<
  K extends State<any> | unknown,
  I = K extends State<infer A> ? A : {},
  IS = {
    [k in keyof I]: T.UIO<I[k]>;
  }
>(_V: View<K>, _I: IS): React.FC<{ children?: React.ReactElement }> {
  const initial = pipe(
    _I as Record<string, any>,
    R.traverseWithIndex(T.effect)((k: string) =>
      pipe(
        _I[k as keyof IS] as any,
        T.map(x => M.observable(x as any))
      )
    ),
    T.map(r => (r as any) as any)
  );

  return ({ children }) => {
    const [state, setState] = React.useState<
      Option<React.FunctionComponentElement<{}>>
    >(none);

    React.useEffect(() => {
      let stop: Lazy<void> | undefined = undefined;

      const getS = T.async<Error, State<any>>(resolve => {
        let c: Lazy<void> | undefined = undefined;

        c = T.run(initial, ex => {
          if (EX.isDone(ex)) {
            resolve(
              Ei.right({
                [stateURI]: {
                  state: ex.value
                }
              })
            );
          } else {
            resolve(
              Ei.left(new Error("initial state should not be allowd to fail"))
            );
          }
        });

        return () => {
          if (c) {
            c();
          }
        };
      });

      const f = new Fancy(_V);

      stop = T.run(
        pipe(
          getS,
          T.chain(state =>
            pipe(
              f.ui,
              T.chain(Cmp =>
                T.sync(() => {
                  const CmpS: React.FC = () => {
                    React.useEffect(() => () => {
                      f.stop();
                    });

                    return React.createElement(Cmp);
                  };

                  setState(some(React.createElement(CmpS)));
                })
              ),
              T.provideAll(state as any)
            )
          )
        ),
        ex => {
          if (!EX.isInterrupt(ex) && !EX.isDone(ex)) {
            console.error(ex);
          }
        }
      );

      return () => {
        if (stop) {
          stop();
        }
      };
    }, []);

    return isSome(state)
      ? state.value
      : children || React.createElement(React.Fragment);
  };
}
