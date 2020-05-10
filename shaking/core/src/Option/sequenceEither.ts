import { either } from "../Either"

import { optionMonad } from "./monad"

export const sequenceEither = either.sequence(optionMonad)
