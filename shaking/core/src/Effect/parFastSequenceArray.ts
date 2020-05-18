import { sequence } from "../Array/array"

import { parFastEffect } from "./effect"

export const parFastSequenceArray =
  /*#__PURE__*/
  (() => sequence(parFastEffect))()
