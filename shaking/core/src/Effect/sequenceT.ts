import { sequenceT as ST } from "fp-ts/lib/Apply"

import { effect } from "./effect"

export const sequenceT = ST(effect)
