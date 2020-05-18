import { sequenceT as ST } from "../Apply"

import { parFastEffect } from "./parFastEffect"

export const parFastSequenceT =
  /*#__PURE__*/
  (() => ST(parFastEffect))()
