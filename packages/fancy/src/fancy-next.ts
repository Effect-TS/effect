import * as React from "react";
import * as DOM from "react-dom";
import * as DOMS from "react-dom/server";
import { effect as T, stream as S, exit as EX } from "@matechs/effect";
import { Dispatcher, Fancy, State, stateURI } from "./fancy";
import { pipe } from "fp-ts/lib/pipeable";
import { Lazy } from "fp-ts/lib/function";
import { Errors } from "io-ts";
import { Either, isRight, isLeft } from "fp-ts/lib/Either";

// alpha
/* istanbul ignore file */

export function page<S>(
  initial: () => S,
  enc: (_: S) => unknown,
  dec: (_: unknown) => Either<Errors, S>
) {
  return <K>(
    view: T.Effect<
      State<S> & Dispatcher<State<S> & K>,
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
            new Fancy(view).ui,
            T.map(Cmp =>
              DOMS.renderToString(
                React.createElement(Cmp, {
                  state: state[stateURI].state
                })
              )
            ),
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

        const f = new Fancy(view);
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
                          S.stream.map(f.actions, _ => {
                            setS(state[stateURI].state);
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

                  return React.createElement(Cmp, {
                    state: s
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
