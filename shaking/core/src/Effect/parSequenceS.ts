import { sequenceS as SS } from "../Apply"

import { parEffect } from "./effect"

export const parSequenceS =
  /*#__PURE__*/
  (() => SS(parEffect))()
