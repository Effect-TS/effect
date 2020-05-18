import { sequence } from "../Tree"

import { effect } from "./effect"

export const sequenceTree =
  /*#__PURE__*/
  (() => sequence(effect))()
