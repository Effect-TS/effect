import { sequenceT as ST } from "../Apply"

import { effectOptionPar } from "./effectOption"

export const parSequenceT =
  /*#__PURE__*/
  (() => ST(effectOptionPar))()
