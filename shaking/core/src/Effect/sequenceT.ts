import { sequenceT as ST } from "../Apply"

import { effect } from "./effect"

export const sequenceT =
  /*#__PURE__*/
  (() => ST(effect))()
