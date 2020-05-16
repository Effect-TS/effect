import { sequenceS as SS } from "../Apply"

import { parEffect } from "./parEffect"

export const parSequenceS = SS(parEffect)
