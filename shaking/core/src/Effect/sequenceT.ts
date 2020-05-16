import { sequenceT as ST } from "../Apply"

import { effect } from "./effect"

export const sequenceT = ST(effect)
