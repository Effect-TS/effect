import { sequence } from "../Record"

import { effect } from "./effect"

export const sequenceRecord =
  /*#__PURE__*/
  (() => sequence(effect))()
