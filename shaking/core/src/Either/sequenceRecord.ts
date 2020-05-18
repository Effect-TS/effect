import { sequence } from "../Record/record"

import { eitherMonad } from "./either"

export const sequenceRecord = sequence(eitherMonad)
