import * as React from "react";
import { effect as T } from "@matechs/effect";
import { useInterval } from "../hooks/useInterval";
import { App } from "../src/app";

// alpha
/* istanbul ignore file */

export const ShowDate = App.view(() =>
  T.pure(() => {
    const [s, setS] = React.useState(0);
    const { date } = App.useState();
    useInterval(() => {
      setS(s + 1);
    }, 500);
    return <div>{`${date.toISOString()} - ${s}`}</div>;
  })
);
