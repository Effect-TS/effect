import * as React from "react";
import { useInterval } from "../hooks/useInterval";
import { App } from "../src/app";
import { effect as T } from "@matechs/effect";

// alpha
/* istanbul ignore file */

export const ShowDate = App.ui.of(
  T.pure(
    App.withState(
      ({
        state: {
          date: { current }
        }
      }) => {
        const [s, setS] = React.useState(0);
        useInterval(() => {
          setS(s + 1);
        }, 500);
        return <div>{`${current.toISOString()} - ${s}`}</div>;
      }
    )
  )
);
