import { sequenceT as ST } from "fp-ts/lib/Apply"

import { parFastEffect } from "./parFastEffect"

export const parFastSequenceT = ST(parFastEffect)
