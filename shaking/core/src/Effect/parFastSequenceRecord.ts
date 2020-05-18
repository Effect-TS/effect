import { sequence } from "../Record"

import { parFastEffect } from "./parFastEffect"

export const parFastSequenceRecord =
  /*#__PURE__*/
  (() => sequence(parFastEffect))()
