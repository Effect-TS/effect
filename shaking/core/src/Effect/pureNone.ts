import { none } from "../Option"

import { pure } from "./pure"

export const pureNone =
  /*#__PURE__*/
  (() => pure(none))()
