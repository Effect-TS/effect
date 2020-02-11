import * as React from "react";
import { UI } from "../../../lib";
import { FlashStateEnv, flashStateURI } from "./state";
import * as M from "mobx";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { effect as T } from "@matechs/effect";

export const DisplayFlash = UI.withRun()((run, dispose) =>
  UI.withState<FlashStateEnv>()<{
    children: (_: { message: string }) => React.ReactElement;
  }>(({ [flashStateURI]: { messages }, children }) => {
    const [message, setMessage] = React.useState<O.Option<string>>(O.none);

    React.useEffect(() => {
      const disposeAutorun = M.autorun(() => {
        const current = messages.length > 0 ? O.some(messages[0]) : O.none;

        setMessage(current);

        if (messages.length > 0) {
          run(
            T.delay(
              T.sync(() => {
                messages.shift();
              }),
              3000
            )
          );
        }
      });

      return () => {
        disposeAutorun();
        dispose();

        messages.splice(0, messages.length);
      };
    }, []);

    return pipe(
      message,
      O.fold(
        () => <></>,
        m =>
          React.createElement(children, {
            message: m
          })
      )
    );
  })
);
