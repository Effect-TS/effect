import { sequence } from "../../Record"

import { stream } from "./index"

export const sequenceRecord =
  /*#__PURE__*/
  (() => sequence(stream))()
