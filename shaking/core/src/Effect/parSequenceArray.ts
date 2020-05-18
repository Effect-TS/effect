import { sequence } from "../Array/array"

import { parEffect } from "./effect"

export const parSequenceArray =
  /*#__PURE__*/
  (() => sequence(parEffect))()
