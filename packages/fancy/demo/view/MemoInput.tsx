import React from "react"
import { effect as T } from "@matechs/effect";
import { UI } from "../../lib";

// alpha
/* istanbul ignore file */

export const MemoInput = UI.of(
  T.pure(React.memo(() => <input type={"text"} />))
);
