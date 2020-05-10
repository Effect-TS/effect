import { sequenceT as ST } from "fp-ts/lib/Apply"

import { option } from "./instances"

export const sequenceT = ST(option)
