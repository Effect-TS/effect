import { sequence } from "../Array/array"

import { eitherMonad } from "./either"

export const sequenceArray =
  /*#__PURE__*/
  (() => sequence(eitherMonad))()
