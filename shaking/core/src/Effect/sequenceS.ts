import { sequenceS as SS } from "../Apply"

import { effect } from "./effect"

export const sequenceS =
  /*#__PURE__*/
  (() => SS(effect))()
