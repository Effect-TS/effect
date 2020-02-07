import * as React from "react";
import * as DOM from "react-dom";
import { effect as T, stream as S, exit as EX } from "@matechs/effect";
import { Runner, Fancy, State, stateURI } from "./fancy";
import { pipe } from "fp-ts/lib/pipeable";
import { Lazy } from "fp-ts/lib/function";
import { Errors, Type } from "io-ts";
import { Either, isRight, right, left } from "fp-ts/lib/Either";
import { NextPageContext } from "next";
import { nextContextURI } from "./next-ctx";

// alpha
/* istanbul ignore file */

export const serverRegistry = {} as Record<string, any>;
export const renderCount = {
  count: 0
};

export function page<S, R, Action>(
  initial: T.UIO<S>,
  enc: (_: S) => unknown,
  dec: (_: unknown) => Either<Errors, S>,
  actionType: Type<Action, unknown>,
  context: React.Context<S>,
  handler: (
    run: <A>(e: T.Effect<R, never, A>) => void
  ) => (action: Action) => void
) {
  return <K>(
    view: T.Effect<State<S> & Runner<State<S> & K>, never, React.FC>
  ) =>
    class extends React.Component<{
      stateToKeep?: string;
      initInBrowser?: boolean;
      renderId?: string;
    }> {
      public readonly REF = React.createRef<HTMLDivElement>();

      public stop: Lazy<void> | undefined = undefined;

      static async getInitialProps(ctx: NextPageContext) {
        const initialS = await T.runToPromise(initial);

        const state: State<S> = {
          [stateURI]: {
            state: initialS,
            version: 0
          }
        };

        const f = new Fancy(view, actionType, handler);

        if (ctx.req) {
          // initialize for the server
          renderCount.count = renderCount.count + 1;

          const rendered = await T.runToPromise(
            pipe(
              f.ui,
              T.map(Cmp =>
                React.createElement(context.Provider, {
                  value: state[stateURI].state,
                  children: React.createElement(Cmp)
                })
              ),
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
          // init on browser, we wrap stream drainer for effects to run
          const component = await T.runToPromise(
            pipe(
              f.ui,
              T.map(
                (Cmp): React.FC<{ state: S; version: number }> => p => {
                  const [sv, setS] = React.useState({
                    s: p.state,
                    v: p.version
                  });

                  React.useEffect(
                    () =>
                      T.run(
                        S.drain(
                          S.stream.map(f.final, _ => {
                            if (state[stateURI].version > sv.v) {
                              setS({
                                s: state[stateURI].state,
                                v: state[stateURI].version
                              });
                            }
                          })
                        ),
                        ex => {
                          if (!EX.isInterrupt(ex)) {
                            console.error(ex);
                          }
                        }
                      ),
                    []
                  );

                  return React.createElement(context.Provider, {
                    value: sv.s,
                    children: React.createElement(Cmp)
                  });
                }
              ),
              T.provideAll({ ...state, [nextContextURI]: { ctx } } as any)
            )
          );

          const provided = React.createElement(component, {
            state: state[stateURI].state,
            version: state[stateURI].version
          });

          window["cmp"] = provided; // save the component to a global place for render to pick

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

              if (isRight(decoded)) {
                resolve(
                  right({
                    [stateURI]: {
                      state: decoded.right,
                      version: 0
                    }
                  })
                );
              } else {
                console.error("Decoding of state failed");
                console.error(decoded.left);

                c = T.run(initial, ex => {
                  if (EX.isDone(ex)) {
                    resolve(
                      right({
                        [stateURI]: {
                          state: ex.value,
                          version: 0
                        }
                      })
                    );
                  } else {
                    resolve(
                      left(
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
                    right({
                      [stateURI]: {
                        state: ex.value,
                        version: 0
                      }
                    })
                  );
                } else {
                  resolve(
                    left(
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
          const f = new Fancy(view, actionType, handler);
          this.stop = T.run(
            pipe(
              getS,
              T.chain(state =>
                pipe(
                  f.ui,
                  T.chain(Cmp =>
                    T.sync(() => {
                      const CmpS: React.FC<{
                        state: S;
                        version: number;
                      }> = p => {
                        const [sv, setS] = React.useState({
                          s: p.state,
                          v: p.version
                        });

                        React.useEffect(
                          () =>
                            T.run(
                              S.drain(
                                S.stream.map(f.final, _ => {
                                  if (state[stateURI].version > sv.v) {
                                    setS({
                                      s: state[stateURI].state,
                                      v: state[stateURI].version
                                    });
                                  }
                                })
                              ),
                              ex => {
                                if (!EX.isInterrupt(ex)) {
                                  console.error(ex);
                                }
                              }
                            ),
                          []
                        );

                        return React.createElement(context.Provider, {
                          value: sv.s,
                          children: React.createElement(Cmp)
                        });
                      };

                      DOM.hydrate(
                        React.createElement(CmpS, {
                          state: state[stateURI].state,
                          version: state[stateURI].version
                        }),
                        this.REF.current
                      );
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
            // we are in the browser but we have an initial markup from the server
            // in this case rendering will be initialized on component did mount
            const markup = document.getElementById("fancy-next-root")
              ?.innerHTML;

            return React.createElement("div", {
              ref: this.REF,
              dangerouslySetInnerHTML: { __html: markup },
              id: "fancy-next-root"
            });
          }
        }
      }
    };
}
