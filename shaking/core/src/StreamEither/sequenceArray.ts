import * as A from "../Array"

import { streamEither } from "./streamEither"

export const sequenceArray = A.sequence(streamEither)
