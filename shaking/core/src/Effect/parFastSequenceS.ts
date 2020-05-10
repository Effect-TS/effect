import { sequenceS as SS } from "fp-ts/lib/Apply"

import { parFastEffect } from "./parFastEffect"

export const parFastSequenceS = SS(parFastEffect)
