import * as React from "react";
import { effect as T, exit as EX } from "@matechs/effect";
import { Fancy, State, stateURI } from "./fancy";
import { pipe } from "fp-ts/lib/pipeable";
import { Lazy } from "fp-ts/lib/function";
import * as Ei from "fp-ts/lib/Either";
import { NextPageContext } from "next";
import { nextContextURI } from "./next-ctx";
import { Option, none, some, isNone } from "fp-ts/lib/Option";
import { Type, Errors } from "io-ts";
import * as M from "mobx";
import * as R from "fp-ts/lib/Record";

// alpha
/* istanbul ignore file */

export const serverRegistry = {} as Record<string, any>;
export const renderCount = {
  count: 0
};

export function page<
  StateDef extends { [k in keyof StateDef]: Type<any, unknown> },
  IS extends {
    [k in keyof StateDef]: T.UIO<StateDef[k]["_A"]>;
  },
  S = {
    [k in keyof StateDef]: StateDef[k]["_A"] & M.IObservableObject;
  }
>(stateDef: StateDef, initialState: IS) {
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

  return <RPage>(view: T.Effect<RPage, never, React.FC>) =>
    class extends React.Component<
      {
        stateToKeep?: string;
        initInBrowser?: boolean;
        renderId?: string;
      },
      {
        cmp: Option<React.FunctionComponentElement<{}>>;
      }
    > {
      constructor(p: any) {
        super(p);

        this.state = { cmp: none };
      }

      public readonly REF = React.createRef<HTMLDivElement>();

      public stop: Lazy<void> | undefined = undefined;
      public autoruns: Array<Lazy<void>> = [];

      static async getInitialProps(ctx: NextPageContext) {
        const initialS = await T.runToPromise(initial);

        const state: State<S> = {
          [stateURI]: {
            state: initialS
          }
        };

        const f = new Fancy(view);

        if (ctx.req) {
          // initialize for the server
          renderCount.count = renderCount.count + 1;

          const rendered = await T.runToPromise(
            pipe(
              f.ui,
              T.map(Cmp => React.createElement(Cmp)),
              T.provideAll({ ...state, [nextContextURI]: { ctx } } as any)
            )
          );

          // cache the component to be used in render()
          serverRegistry[`${renderCount.count}`] = rendered;

          const stateS = state[stateURI].state;

          return {
            renderId: `${renderCount.count}`, // save the unique render id for render to discover component in registry
            stateToKeep: JSON.stringify(enc(stateS)) // cache the state for client init
          };
        } else {
          const component = await T.runToPromise(
            pipe(
              f.ui,
              T.map(
                (Cmp): React.FC => () => {
                  React.useEffect(() => () => {
                    f.stop();
                  });

                  return React.createElement(Cmp);
                }
              ),
              T.provideAll({ ...state, [nextContextURI]: { ctx } } as any)
            )
          );

          window["cmp"] = React.createElement(component); // save the component to a global place for render to pick

          return {
            initInBrowser: true
          };
        }
      }

      componentDidMount() {
        // only if we have not initialized already in getInitialProps
        // result of first page render after SSR
        if (!this.props.initInBrowser) {
          const getS = T.async<Error, State<S>>(resolve => {
            let c: Lazy<void> | undefined = undefined;

            if (this.props.stateToKeep) {
              const restored = JSON.parse(this.props.stateToKeep);
              const decoded = dec(restored);

              if (Ei.isRight(decoded)) {
                resolve(
                  Ei.right({
                    [stateURI]: {
                      state: decoded.right
                    }
                  })
                );
              } else {
                console.error("Decoding of state failed");
                console.error(decoded.left);

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
                      Ei.left(
                        new Error("initial state should not be allowd to fail")
                      )
                    );
                  }
                });
              }
            } else {
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
                    Ei.left(
                      new Error("initial state should not be allowd to fail")
                    )
                  );
                }
              });
            }

            return () => {
              if (c) {
                c();
              }
            };
          });

          // as on getInitialProps but for client only
          const f = new Fancy(view);

          this.stop = T.run(
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

                      this.setState({
                        cmp: some(React.createElement(CmpS))
                      });
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
        }
      }

      componentWillUnmount() {
        if (this.stop) {
          this.stop();
        }
      }

      render() {
        if (this.props.initInBrowser) {
          // the component was initialized in a browser
          return React.createElement("div", {
            ref: this.REF,
            id: "fancy-next-root",
            children: window["cmp"]
          });
        } else {
          if (this.props.renderId && serverRegistry[this.props.renderId]) {
            // the component was in the server and we are rendering in the server for next
            // to propagate (for example to gather sheets)
            const component = serverRegistry[this.props.renderId];

            delete serverRegistry[this.props.renderId];

            return React.createElement("div", {
              ref: this.REF,
              id: "fancy-next-root",
              children: component
            });
          } else {
            if (isNone(this.state.cmp)) {
              const markup =
                typeof document !== "undefined"
                  ? document.getElementById("fancy-next-root")?.innerHTML
                  : null;

              return React.createElement("div", {
                ref: this.REF,
                dangerouslySetInnerHTML: { __html: markup },
                id: "fancy-next-root"
              });
            } else {
              return React.createElement("div", {
                ref: this.REF,
                id: "fancy-next-root",
                children: this.state.cmp.value
              });
            }
          }
        }
      }
    };
}
