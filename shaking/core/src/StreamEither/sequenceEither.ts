import * as E from "../Either"

import { streamEither } from "./streamEither"

export const sequenceEither = E.sequence(streamEither)
