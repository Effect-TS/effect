import { sequence } from "../Option/option"

import { eitherMonad } from "./either"

export const sequenceOption = sequence(eitherMonad)
