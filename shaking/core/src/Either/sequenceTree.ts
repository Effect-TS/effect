import { sequence } from "../Tree"

import { eitherMonad } from "./either"

export const sequenceTree = sequence(eitherMonad)
