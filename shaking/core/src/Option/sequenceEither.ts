import { sequence } from "../Either/either"

import { optionMonad } from "./option"

export const sequenceEither =
  /*#__PURE__*/
  (() => sequence(optionMonad))()
