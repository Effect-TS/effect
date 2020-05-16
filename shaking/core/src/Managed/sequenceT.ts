import { sequenceT as ST } from "../Apply"

import { managed } from "./managed"

export const sequenceT = ST(managed)
