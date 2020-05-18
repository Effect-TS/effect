import { sequenceT as ST } from "../Apply"

import { parFastEffect } from "./effect"

export const parFastSequenceT =
  /*#__PURE__*/
  (() => ST(parFastEffect))()
