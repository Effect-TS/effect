import { sequenceT as ST } from "../Apply"

import { parEffect } from "./effect"

export const parSequenceT =
  /*#__PURE__*/
  (() => ST(parEffect))()
