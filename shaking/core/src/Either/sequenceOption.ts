import { sequence } from "../Option/option"

import { eitherMonad } from "./either"

export const sequenceOption =
  /*#__PURE__*/
  (() => sequence(eitherMonad))()
