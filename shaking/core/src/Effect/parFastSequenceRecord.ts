import { sequence } from "../Record"

import { parFastEffect } from "./parFastEffect"

export const parFastSequenceRecord = sequence(parFastEffect)
