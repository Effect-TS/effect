import * as React from "react";
import * as DOM from "react-dom";
import * as DOMS from "react-dom/server";
import { effect as T, stream as S, exit as EX } from "@matechs/effect";
import { Runner, Fancy, State, stateURI } from "./fancy";
import { pipe } from "fp-ts/lib/pipeable";
import { Lazy } from "fp-ts/lib/function";
import { Errors, Type } from "io-ts";
import { Either, isRight, isLeft } from "fp-ts/lib/Either";
import { deepEqual } from "fast-equals";

// alpha
/* istanbul ignore file */

export function page<S, R, Action>(
  initial: () => S,
  enc: (_: S) => unknown,
  dec: (_: unknown) => Either<Errors, S>,
  actionType: Type<Action, unknown>,
  context: React.Context<S>,
  handler: (run: <A>(e: T.Effect<R, never, A>) => void) => (action: Action) => void
) {
  return <K>(
    view: T.Effect<
      State<S> & Runner<State<S> & K>,
      never,
      React.FC<{ state: S }>
    >
  ) =>
    class extends React.Component<{
      markup: string;
      stateToKeep: string;
    }> {
      public readonly REF = React.createRef<HTMLDivElement>();

      public stop: Lazy<void> | undefined = undefined;

      static async getInitialProps() {
        const state: State<S> = {
          [stateURI]: {
            state: initial()
          }
        };

        const rendered = await T.runToPromise(
          pipe(
            new Fancy(view, actionType, handler).ui,
            T.map(Cmp =>
              React.createElement(context.Provider, {
                value: state[stateURI].state,
                children: React.createElement(Cmp, {
                  state: state[stateURI].state
                })
              })
            ),
            T.map(Cmp => DOMS.renderToString(Cmp)),
            T.provideAll(state as any)
          )
        );

        const stateS = state[stateURI].state;

        return {
          markup: rendered,
          stateToKeep: JSON.stringify(enc(stateS))
        };
      }

      componentDidMount() {
        const restored = JSON.parse(this.props.stateToKeep);
        const decoded = dec(restored);

        const state: State<S> = isRight(decoded)
          ? {
              [stateURI]: {
                state: decoded.right
              }
            }
          : {
              [stateURI]: {
                state: initial()
              }
            };

        if (isLeft(decoded)) {
          console.error("Decoding of state failed");
          console.error(decoded.left);
        }

        const f = new Fancy(view, actionType, handler);
        this.stop = T.run(
          pipe(
            f.ui,
            T.chain(Cmp =>
              T.sync(() => {
                const CmpS: React.FC<{ state: S }> = p => {
                  const [s, setS] = React.useState(p.state);

                  React.useEffect(
                    () =>
                      T.run(
                        S.drain(
                          S.stream.map(f.final, _ => {
                            if (!deepEqual(s, state[stateURI].state)) {
                              setS(state[stateURI].state);
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
                    value: s,
                    children: React.createElement(Cmp, {
                      state: s
                    })
                  });
                };

                DOM.hydrate(
                  React.createElement(CmpS, {
                    state: state[stateURI].state
                  }),
                  this.REF.current
                );
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
        const { markup } = this.props;

        return React.createElement("div", {
          ref: this.REF,
          dangerouslySetInnerHTML: { __html: markup }
        });
      }
    };
}
