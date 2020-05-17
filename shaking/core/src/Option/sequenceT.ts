import { sequenceT as ST } from "../Apply"

import { optionMonad } from "./option"

export const sequenceT = ST(optionMonad)
