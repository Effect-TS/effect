import { record } from "fp-ts/lib/Record"

import { parEffect } from "./parEffect"

export const parSequenceRecord = record.sequence(parEffect)
