import { sequence } from "../Tree"

import { optionMonad } from "./option"

export const sequenceTree = sequence(optionMonad)
