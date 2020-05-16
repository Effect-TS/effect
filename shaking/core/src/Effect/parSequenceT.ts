import { sequenceT as ST } from "../Apply"

import { parEffect } from "./parEffect"

export const parSequenceT = ST(parEffect)
