import { sequenceT as ST } from "fp-ts/lib/Apply"

import { parEffect } from "./parEffect"

export const parSequenceT = ST(parEffect)
