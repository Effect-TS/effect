import { either } from "../Either/either"

import { optionMonad } from "./monad"

export const sequenceEither = either.sequence(optionMonad)
