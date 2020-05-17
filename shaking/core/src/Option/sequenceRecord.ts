import { sequence } from "../Record/record"

import { optionMonad } from "./option"

export const sequenceRecord = sequence(optionMonad)
