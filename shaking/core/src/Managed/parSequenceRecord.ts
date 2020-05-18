import { sequence } from "../Record"

import { parManaged } from "./managed"

export const parSequenceRecord =
  /*#__PURE__*/
  (() => sequence(parManaged))()
