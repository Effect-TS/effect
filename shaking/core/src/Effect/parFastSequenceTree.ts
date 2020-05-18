import { sequence } from "../Tree"

import { parFastEffect } from "./parFastEffect"

export const parFastSequenceTree =
  /*#__PURE__*/
  (() => sequence(parFastEffect))()
