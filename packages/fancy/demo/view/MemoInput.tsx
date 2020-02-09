import * as React from "react";
import { App } from "../src/app";
import { effect as T } from "@matechs/effect";

// alpha
/* istanbul ignore file */

export const MemoInput = App.ui.of(
  T.pure(React.memo(() => <input type={"text"} />))
);
