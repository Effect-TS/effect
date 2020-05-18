import { sequence } from "../Tree"

import { optionMonad } from "./option"

export const sequenceTree =
  /*#__PURE__*/
  (() => sequence(optionMonad))()
