import { sequence } from "../Either/sequence"

import { optionMonad } from "./monad"

export const sequenceEither = sequence(optionMonad)
