import { sequence } from "../Either/either"

import { optionMonad } from "./option"

export const sequenceEither = sequence(optionMonad)
