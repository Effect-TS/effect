import { sequence } from "../Array/array"

import { parFastEffect } from "./parFastEffect"

export const parFastSequenceArray =
  /*#__PURE__*/
  (() => sequence(parFastEffect))()
