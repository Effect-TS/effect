import { sequence } from "../Record"

import { parEffect } from "./effect"

export const parSequenceRecord =
  /*#__PURE__*/
  (() => sequence(parEffect))()
