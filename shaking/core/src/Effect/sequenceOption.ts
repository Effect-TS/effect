import { sequence } from "../Option/option"

import { effect } from "./effect"

export const sequenceOption =
  /*#__PURE__*/
  (() => sequence(effect))()
