import { sequenceS as SS } from "../Apply"

import { streamEither } from "./streamEither"

export const sequenceS = SS(streamEither)
