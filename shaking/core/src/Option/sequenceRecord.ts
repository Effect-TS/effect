import { sequence } from "../Record/sequence"

import { optionMonad } from "./monad"

export const sequenceRecord = sequence(optionMonad)
