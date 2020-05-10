import { record } from "fp-ts/lib/Record"

import { parFastEffect } from "./parFastEffect"

export const parFastSequenceRecord = record.sequence(parFastEffect)
