import { sequenceT as ST } from "../Apply"

import { effectOption } from "./effectOption"

export const sequenceT =
  /*#__PURE__*/
  (() => ST(effectOption))()
