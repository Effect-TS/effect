import { sequenceT as ST } from "../Apply"

import { parManaged } from "./managed"

export const parSequenceT =
  /*#__PURE__*/
  (() => ST(parManaged))()
