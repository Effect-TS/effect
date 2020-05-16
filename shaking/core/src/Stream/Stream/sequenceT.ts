import { sequenceT as ST } from "../../Apply"

import { stream } from "./index"

export const sequenceT = ST(stream)
