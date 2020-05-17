import { sequence } from "../Either/sequence"

import { optionMonad } from "./option"

export const sequenceEither = sequence(optionMonad)
