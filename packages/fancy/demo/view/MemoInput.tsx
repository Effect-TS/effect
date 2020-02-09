import * as React from "react";
import { App } from "../src/app";

// alpha
/* istanbul ignore file */

export const MemoInput = App.pureUI(() =>
  React.memo(() => <input type={"text"} />)
);
