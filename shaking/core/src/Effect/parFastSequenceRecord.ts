import { sequence } from "../Record/sequence"

import { parFastEffect } from "./parFastEffect"

export const parFastSequenceRecord = sequence(parFastEffect)
