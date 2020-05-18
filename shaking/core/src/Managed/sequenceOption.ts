import { sequence } from "../Option"

import { managed } from "./managed"

export const sequenceOption =
  /*#__PURE__*/
  (() => sequence(managed))()
