import { array } from "../Array"

import { optionMonad } from "./monad"

export const sequenceArray = array.sequence(optionMonad)
