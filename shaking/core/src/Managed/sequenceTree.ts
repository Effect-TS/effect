import { sequence } from "../Tree"

import { managed } from "./managed"

export const sequenceTree =
  /*#__PURE__*/
  (() => sequence(managed))()
