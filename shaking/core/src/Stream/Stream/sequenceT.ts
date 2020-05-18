import { sequenceT as ST } from "../../Apply"

import { stream } from "./index"

export const sequenceT =
  /*#__PURE__*/
  (() => ST(stream))()
