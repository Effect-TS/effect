import { sequence } from "../Tree"

import { parEffect } from "./effect"

export const parSequenceTree =
  /*#__PURE__*/
  (() => sequence(parEffect))()
