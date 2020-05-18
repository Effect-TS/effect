import { sequence } from "../Array"

import { optionMonad } from "./option"

export const sequenceArray =
  /*#__PURE__*/
  (() => sequence(optionMonad))()
