import { sequenceS as SS } from "../Apply"

import { parFastEffect } from "./effect"

export const parFastSequenceS =
  /*#__PURE__*/
  (() => SS(parFastEffect))()
