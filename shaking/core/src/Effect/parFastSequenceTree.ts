import { sequence } from "../Tree"

import { parFastEffect } from "./effect"

export const parFastSequenceTree =
  /*#__PURE__*/
  (() => sequence(parFastEffect))()
