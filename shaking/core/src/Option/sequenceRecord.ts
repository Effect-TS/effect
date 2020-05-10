import { record } from "../Record"

import { optionMonad } from "./monad"

export const sequenceRecord = record.sequence(optionMonad)
