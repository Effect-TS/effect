import { sequence } from "../Record/record"

import { optionMonad } from "./option"

export const sequenceRecord =
  /*#__PURE__*/
  (() => sequence(optionMonad))()
