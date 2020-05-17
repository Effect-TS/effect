import { sequence } from "../Record/record"

import { optionMonad } from "./monad"

export const sequenceRecord = sequence(optionMonad)
