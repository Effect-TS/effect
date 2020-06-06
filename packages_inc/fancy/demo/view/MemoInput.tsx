import React from "react"

import { UI } from "../../src"

import * as T from "@matechs/core/Effect"

// alpha
/* istanbul ignore file */

export const MemoInput = UI.of(T.pure(React.memo(() => <input type={"text"} />)))
