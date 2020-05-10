import { sequenceS as SS } from "fp-ts/lib/Apply"

import { parEffect } from "./parEffect"

export const parSequenceS = SS(parEffect)
