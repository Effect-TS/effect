import { sequence } from "../Record"

import { parFastEffect } from "./effect"

export const parFastSequenceRecord =
  /*#__PURE__*/
  (() => sequence(parFastEffect))()
