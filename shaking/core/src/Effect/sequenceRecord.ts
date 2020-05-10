import { record } from "fp-ts/lib/Record"

import { effect } from "./effect"

export const sequenceRecord = record.sequence(effect)
