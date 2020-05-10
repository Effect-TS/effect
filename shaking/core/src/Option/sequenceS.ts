import { sequenceS as SS } from "fp-ts/lib/Apply"

import { optionMonad } from "./monad"

export const sequenceS = SS(optionMonad)
