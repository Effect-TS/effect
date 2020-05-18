import { sequenceS as SS } from "../Apply"

import { parEffect } from "./parEffect"

export const parSequenceS =
  /*#__PURE__*/
  (() => SS(parEffect))()
