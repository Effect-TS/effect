import { sequence } from "../Array"

import { optionMonad } from "./option"

export const sequenceArray = sequence(optionMonad)
