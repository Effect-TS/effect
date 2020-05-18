import { sequence } from "../Tree"

import { eitherMonad } from "./either"

export const sequenceTree =
  /*#__PURE__*/
  (() => sequence(eitherMonad))()
