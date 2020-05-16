import { option } from "../Option"

import { streamEither } from "./streamEither"

export const sequenceOption = option.sequence(streamEither)
