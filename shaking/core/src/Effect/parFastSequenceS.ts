import { sequenceS as SS } from "../Apply"

import { parFastEffect } from "./parFastEffect"

export const parFastSequenceS =
  /*#__PURE__*/
  (() => SS(parFastEffect))()
