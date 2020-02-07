import * as React from "react";
import * as DOM from "react-dom";
import * as DOMS from "react-dom/server";
import { effect as T, stream as S, exit as EX } from "@matechs/effect";
import { Runner, Fancy, State, stateURI } from "./fancy";
import { pipe } from "fp-ts/lib/pipeable";
import { Lazy } from "fp-ts/lib/function";
import { Errors, Type } from "io-ts";
import { Either, isRight, isLeft } from "fp-ts/lib/Either";
import { NextPageContext } from "next";
import { nextContextURI } from "./next-ctx";

// alpha
/* istanbul ignore file */

export function page<S, R, Action>(
  initial: () => S,
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
      markup: string;
      stateToKeep: string;
    }> {
      public readonly REF = React.createRef<HTMLDivElement>();

      public stop: Lazy<void> | undefined = undefined;

      static async getInitialProps(ctx: NextPageContext) {
        if (ctx.req) {
          const state: State<S> = {
            [stateURI]: {
              state: initial(),
              version: 0
            }
          };

          const rendered = await T.runToPromise(
            pipe(
              new Fancy(view, actionType, handler).ui,
              T.map(Cmp =>
                React.createElement(context.Provider, {
                  value: state[stateURI].state,
                  children: React.createElement(Cmp)
                })
              ),
              T.map(Cmp => DOMS.renderToString(Cmp)),
              T.provideAll({ ...state, [nextContextURI]: { ctx } } as any)
            )
          );

          const stateS = state[stateURI].state;

          return {
            markup: rendered,
            stateToKeep: JSON.stringify(enc(stateS))
          };
        } else {
          return {
            browser: true
          };
        }
      }

      componentDidMount() {
        let state: State<S>;

        if (this.props.stateToKeep) {
          const restored = JSON.parse(this.props.stateToKeep);
          const decoded = dec(restored);

          state = isRight(decoded)
            ? {
                [stateURI]: {
                  state: decoded.right,
                  version: 0
                }
              }
            : {
                [stateURI]: {
                  state: initial(),
                  version: 0
                }
              };

          if (isLeft(decoded)) {
            console.error("Decoding of state failed");
            console.error(decoded.left);
          }
        } else {
          state = {
            [stateURI]: {
              state: initial(),
              version: 0
            }
          };
        }

        const f = new Fancy(view, actionType, handler);
        this.stop = T.run(
          pipe(
            f.ui,
            T.chain(Cmp =>
              T.sync(() => {
                const CmpS: React.FC<{ state: S; version: number }> = p => {
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

                if (this.props.markup) {
                  DOM.hydrate(
                    React.createElement(CmpS, {
                      state: state[stateURI].state,
                      version: state[stateURI].version
                    }),
                    this.REF.current
                  );
                } else {
                  DOM.render(
                    React.createElement(CmpS, {
                      state: state[stateURI].state,
                      version: state[stateURI].version
                    }),
                    this.REF.current
                  );
                }
              })
            ),
            T.provideAll(state as any)
          ),
          ex => {
            if (!EX.isInterrupt(ex) && !EX.isDone(ex)) {
              console.error(ex);
            }
          }
        );
      }

      componentWillUnmount() {
        if (this.stop) {
          this.stop();
        }
      }

      render() {
        if (this.props.markup) {
          const { markup } = this.props;

          return React.createElement("div", {
            ref: this.REF,
            dangerouslySetInnerHTML: { __html: markup }
          });
        } else {
          return React.createElement("div", {
            ref: this.REF
          });
        }
      }
    };
}
