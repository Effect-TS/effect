import { sequence } from "../Record"

import { managed } from "./managed"

export const sequenceRecord =
  /*#__PURE__*/
  (() => sequence(managed))()
