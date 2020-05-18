import { sequence } from "../Tree"

import { parEffect } from "./parEffect"

export const parSequenceTree =
  /*#__PURE__*/
  (() => sequence(parEffect))()
