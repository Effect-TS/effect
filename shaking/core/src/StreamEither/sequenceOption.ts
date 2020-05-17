import * as O from "../Option"

import { streamEither } from "./streamEither"

export const sequenceOption = O.sequence(streamEither)
