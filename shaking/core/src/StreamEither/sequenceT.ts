import { sequenceT as ST } from "../Apply"

import { streamEither } from "./streamEither"

export const sequenceT = ST(streamEither)
