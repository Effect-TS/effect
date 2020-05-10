import { sequenceS as SS } from "fp-ts/lib/Apply"

import { effect } from "./effect"

export const sequenceS = SS(effect)
