import { sequence } from "../Array"

import { parManaged } from "./managed"

export const parSequenceArray =
  /*#__PURE__*/
  (() => sequence(parManaged))()
