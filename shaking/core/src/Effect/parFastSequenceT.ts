import { sequenceT as ST } from "../Apply"

import { parFastEffect } from "./parFastEffect"

export const parFastSequenceT = ST(parFastEffect)
