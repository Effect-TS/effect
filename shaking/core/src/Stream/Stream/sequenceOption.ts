import { sequence } from "../../Option"

import { stream } from "./index"

export const sequenceOption =
  /*#__PURE__*/
  (() => sequence(stream))()
