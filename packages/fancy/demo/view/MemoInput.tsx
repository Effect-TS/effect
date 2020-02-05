import * as React from "react"
import { effect as T } from "@matechs/effect";
import { App } from "../src/app";

// alpha
/* istanbul ignore file */

export const MemoInput = App.view(_ =>
  T.pure(React.memo(() => <input type={"text"} />))
);
