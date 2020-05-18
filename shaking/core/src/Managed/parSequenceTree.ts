import { sequence } from "../Tree"

import { managed } from "./managed"

export const parSequenceTree =
  /*#__PURE__*/
  (() => sequence(managed))()
