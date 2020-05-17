import { sequenceS as SS } from "../Apply"

import { optionMonad } from "./option"

export const sequenceS = SS(optionMonad)
