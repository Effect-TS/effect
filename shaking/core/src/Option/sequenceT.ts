import { sequenceT as ST } from "../Apply"

import { optionMonad } from "./option"

export const sequenceT =
  /*#__PURE__*/
  (() => ST(optionMonad))()
