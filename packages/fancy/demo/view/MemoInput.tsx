import React from "react"
import { T } from "@matechs/prelude";
import { UI } from "../../src";

// alpha
/* istanbul ignore file */

export const MemoInput = UI.of(
  T.pure(React.memo(() => <input type={"text"} />))
);
