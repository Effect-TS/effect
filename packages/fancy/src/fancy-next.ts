import * as React from "react";
import * as DOM from "react-dom";
import * as DOMS from "react-dom/server";
import { effect as T, stream as S, exit as EX } from "@matechs/effect";
import { Dispatcher, Fancy, State, stateURI } from "./fancy";
import { pipe } from "fp-ts/lib/pipeable";
import { Lazy } from "fp-ts/lib/function";
import { Errors } from "io-ts";
import { Either, isRight } from "fp-ts/lib/Either";

// alpha
/* istanbul ignore file */

export function page<S>(
  initial: () => S,
  enc: (_: S) => unknown,
  dec: (_: unknown) => Either<Errors, S>
) {
  return <K>(
    view: T.Effect<State<S> & Dispatcher<State<S> & K>, never, React.FC>
  ) =>
    class extends React.Component<{
      markup: string;
      stateToKeep: string;
    }> {
      public readonly REF = React.createRef<HTMLDivElement>();

      public stop: Lazy<void> | undefined = undefined;

      public readonly main = pipe(
        new Fancy(view).ui,
        S.chain(Cmp =>
          S.encaseEffect(
            T.sync(() => {
              //console.log(DOMS.renderToString(React.createElement(Cmp)))
              DOM.render(React.createElement(Cmp), this.REF.current);
            })
          )
        )
      );

      static async getInitialProps() {
        const state: State<S> = {
          [stateURI]: {
            state: initial()
          }
        };

        const rendered = await T.runToPromise(
          pipe(
            S.collectArray(
              S.take(
                pipe(
                  new Fancy(view).ui,
                  S.map(Cmp => DOMS.renderToString(React.createElement(Cmp)))
                ),
                1
              )
            ),
            T.provideAll(state as any)
          )
        );

        const stateS = state[stateURI].state;

        return {
          markup: rendered[0],
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

        this.stop = T.run(
          pipe(S.drain(this.main), T.provideAll(state as any)),
          ex => {
            if (!EX.isInterrupt(ex)) {
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
