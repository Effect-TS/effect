import { sequenceT as ST } from "fp-ts/lib/Apply"

import { optionMonad } from "./monad"

export const sequenceT = ST(optionMonad)
