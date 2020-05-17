import { record } from "../Record/record"

import { eitherMonad } from "./eitherMonad"

export const sequenceRecord = record.sequence(eitherMonad)
