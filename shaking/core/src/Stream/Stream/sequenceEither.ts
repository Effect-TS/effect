import { sequence } from "../../Either"

import { stream } from "./index"

export const sequenceEither =
  /*#__PURE__*/
  (() => sequence(stream))()
