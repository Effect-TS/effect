import { sequenceS as SS } from "../Apply"

import { optionMonad } from "./option"

export const sequenceS =
  /*#__PURE__*/
  (() => SS(optionMonad))()
