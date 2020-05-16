import { sequenceT as ST } from "../Apply"

import { optionMonad } from "./monad"

export const sequenceT = ST(optionMonad)
