import { record } from "../Record"

import { eitherMonad } from "./eitherMonad"

export const sequenceRecord = record.sequence(eitherMonad)
