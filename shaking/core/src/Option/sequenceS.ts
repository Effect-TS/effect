import { sequenceS as SS } from "../Apply"

import { optionMonad } from "./monad"

export const sequenceS = SS(optionMonad)
